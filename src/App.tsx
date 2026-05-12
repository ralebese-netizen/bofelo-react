import { useState, useEffect, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import { 
    ConsoleLogger, 
    LogLevel, 
    DefaultDeviceController, 
    MeetingSessionConfiguration, 
    DefaultMeetingSession 
} from "https://esm.sh/amazon-chime-sdk-js@3?bundle";
import './App.css';

// Configure AWS
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);
const client = generateClient<any>();

export default function App() {
  const [view, setView] = useState('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- CALL STATE ---
  const [callActive, setCallActive] = useState(false);
  const [callStatusText, setCallStatusText] = useState('Connecting...');
  const [callTime, setCallTime] = useState('00:00');
  
  // Refs for "Hidden" values (to avoid re-renders)
  const meetingSession = useRef<any>(null);
  const localStream = useRef<any>(null);
  const timerInterval = useRef<any>(null);
  const callSeconds = useRef(0);

  // --- CALL LOGIC ---
  const startCall = async (orderId: string, userId: string) => {
    try {
      setCallActive(true);
      setCallStatusText("Connecting securely...");

      // 1. Get Microhpone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.current = stream;

      // 2. Ask AWS for a Meeting Room
      const response = await fetch("https://e0yvpisdaj.execute-api.eu-north-1.amazonaws.com/default/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, userId: `Driver_${userId}` })
      });
      const data = await response.json();

      // 3. Setup Chime
      const logger = new ConsoleLogger('ChimeLogs', LogLevel.WARN);
      const deviceController = new DefaultDeviceController(logger);
      const configuration = new MeetingSessionConfiguration(data.Meeting, data.Attendee);
      meetingSession.current = new DefaultMeetingSession(configuration, logger, deviceController);

      // 4. Listen for Events
      meetingSession.current.audioVideo.addObserver({
        audioVideoDidStart: () => {
          setCallStatusText("Ringing...");
        },
        audioVideoDidStop: () => stopCall()
      });

      // Listen for the Customer joining
      meetingSession.current.audioVideo.realtimeSubscribeToAttendeeIdPresence((id: string, present: boolean) => {
        if (present && !id.includes(configuration.credentials.attendeeId)) {
          setCallStatusText("Secure Call Active");
          startTimer();
        }
      });

      // 5. Connect Audio
      const audioInputDevices = await meetingSession.current.audioVideo.listAudioInputDevices();
      await meetingSession.current.audioVideo.startAudioInput(audioInputDevices[0].deviceId);
      const audioElement = document.getElementById('meeting-audio') as HTMLAudioElement;
      meetingSession.current.audioVideo.bindAudioElement(audioElement);
      meetingSession.current.audioVideo.start();

    } catch (err: any) {
      alert("Call Error: " + err.message);
      stopCall();
    }
  };

  const stopCall = () => {
    if (meetingSession.current) meetingSession.current.audioVideo.stop();
    if (localStream.current) localStream.current.getTracks().forEach((t: any) => t.stop());
    if (timerInterval.current) clearInterval(timerInterval.current);
    
    setCallActive(false);
    setCallStatusText('IDLE');
    callSeconds.current = 0;
  };

  const startTimer = () => {
    timerInterval.current = setInterval(() => {
      callSeconds.current++;
      const mins = String(Math.floor(callSeconds.current / 60)).padStart(2, '0');
      const secs = String(callSeconds.current % 60).padStart(2, '0');
      setCallTime(`${mins}:${secs}`);
    }, 1000);
  };

  // --- RENDERING ---
  return (
    <div className="App">
      {/* 1. HIDDEN AUDIO ELEMENT */}
      <audio id="meeting-audio" style={{ display: 'none' }}></audio>

      {/* 2. CALL BANNER */}
      {callActive && (
        <div id="active-call-banner" style={{ display: 'block' }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
            🛡️ {callStatusText} <br />
            <span style={{ color: '#4ade80', fontSize: '14px' }}>{callTime}</span>
          </h3>
          <button onClick={stopCall} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 24px', borderRadius: '20px', fontWeight: '800' }}>
            End Call
          </button>
        </div>
      )}

      {/* 3. APP VIEWS */}
      {view === 'LOGIN' ? (
        <div id="login-screen">
          <div className="login-card">
            <h1 className="login-title">BOFELO</h1>
            <input type="email" className="login-input" placeholder="Email" onChange={e => setEmail(e.target.value)} />
            <input type="password" className="login-input" placeholder="Password" onChange={e => setPassword(e.target.value)} />
            <button className="login-btn-submit" onClick={() => setView('DASHBOARD')}>Login</button>
          </div>
        </div>
      ) : (
        <div id="dashboard" style={{ display: 'block' }}>
          <div className="header">
            <h1 style={{ fontSize: '18px', fontWeight: '800' }}>Bofelo Driver</h1>
            <button className="btn-logout" onClick={() => setView('LOGIN')}>Logout</button>
          </div>
          <div className="container">
            <div className="section-title">Active Orders</div>
            <div className="order-card">
               <button className="btn-outline" onClick={() => startCall('order123', 'driver456')}>
                 📞 Secure Call Customer
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
