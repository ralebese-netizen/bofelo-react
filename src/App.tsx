// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import './App.css';

// 1. Setup AWS Connection
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);
const client = generateClient();

export default function App() {
  // --- 1. GLOBAL STATE ---
  const [view, setView] = useState('LOGIN'); // LOGIN, SIGNUP, PENDING, DASHBOARD
  const [user, setUser] = useState(null);
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');

  // App State
  const [activeOrders, setActiveOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Modals
  const [showProfile, setShowProfile] = useState(false);
  const [chatOrderId, setChatOrderId] = useState(null);
  
  // Tracking Reference
  const gpsWatchId = useRef(null);

  // --- 2. AUTHENTICATION MANAGER ---
  const handleAuth = async (type) => {
    try {
      if (type === 'SIGNUP') {
        const { userId } = await signUp({ 
            username: email, 
            password,
            options: { userAttributes: { email, name: fullName, phone_number: phone } }
        });
        // Create DB Profile
        await client.models.Driver.create({
            id: userId, email, fullName, phoneNumber: phone, status: 'pending', walletBalance: 0
        });
        setView('PENDING');
      } else {
        await signIn({ username: email, password });
        checkDriverStatus();
      }
    } catch (e) { alert("Auth Error: " + e.message); }
  };

  const checkDriverStatus = async () => {
    try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        // Assuming you have a Driver model in AWS Data
        const { data: driverProfile } = await client.models.Driver.get({ id: currentUser.userId });
        
        if (driverProfile?.status === 'pending') {
            setView('PENDING');
        } else if (driverProfile?.status === 'suspended') {
            alert("Account Suspended. Contact Support.");
        } else {
            setWalletBalance(driverProfile?.walletBalance || 0);
            setView('DASHBOARD');
            startOrderListeners(currentUser.userId);
        }
    } catch (e) { setView('LOGIN'); }
  };

  const handleLogout = async () => {
      stopTracking();
      await signOut();
      setUser(null);
      setView('LOGIN');
  };

  // --- 3. ORDER FEED MANAGERS ---
  const startOrderListeners = (driverId) => {
      // Listen for New Requests
      client.models.Order.observeQuery({
          filter: { status: { eq: 'Pending' } }
      }).subscribe(({ items }) => setPendingOrders(items));

      // Listen for Active Deliveries assigned to this driver
      client.models.Order.observeQuery({
          filter: { status: { eq: 'Accepted' }, driverId: { eq: driverId } }
      }).subscribe(({ items }) => {
          setActiveOrders(items);
          if (items.length > 0) startTracking(items[0].id);
          else stopTracking();
      });
  };

  const acceptOrder = async (orderId) => {
      await client.models.Order.update({
          id: orderId,
          status: 'Accepted',
          driverId: user.userId
      });
  };

  const completeOrder = async (orderId, baseFee) => {
      const pin = prompt("Enter 4-digit customer PIN:");
      if (!pin) return;
      
      // Verification logic goes here
      await client.models.Order.update({ id: orderId, status: 'Completed' });
      
      const payout = baseFee * 0.95;
      setWalletBalance(prev => prev + payout);
      await client.models.Driver.update({ id: user.userId, walletBalance: walletBalance + payout });
      
      alert(`Success! M${payout.toFixed(2)} added to Wallet.`);
  };

  // --- 4. TRACKING MANAGER ---
  const startTracking = (orderId) => {
      if (gpsWatchId.current) return;
      if (!navigator.geolocation) return;
      
      gpsWatchId.current = navigator.geolocation.watchPosition(
          (position) => {
              // Update Location in AWS DynamoDB
              client.models.Order.update({
                  id: orderId,
                  driverLat: position.coords.latitude,
                  driverLng: position.coords.longitude
              });
          },
          (error) => console.warn(error),
          { enableHighAccuracy: true, timeout: 5000 }
      );
  };

  const stopTracking = () => {
      if (gpsWatchId.current) {
          navigator.geolocation.clearWatch(gpsWatchId.current);
          gpsWatchId.current = null;
      }
  };

  // --- 5. WALLET MANAGER ---
  const requestWithdrawal = async () => {
      try {
          const response = await fetch("https://u9o1zxrb58.execute-api.eu-north-1.amazonaws.com/default/ctobopenaip", {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ driverId: user.userId })
          });
          if (response.ok) {
              alert("Funds sent to M-Pesa!");
              setWalletBalance(0);
          } else {
              alert("Withdrawal failed. Try again later.");
          }
      } catch (e) { alert("Network Error"); }
  };

  // --- RENDER UI ---
  
  if (view === 'LOGIN') return (
    <div id="login-screen">
      <div className="login-card">
        <h1 className="login-title">BOFELO</h1>
        <input type="email" className="login-input" placeholder="Driver Email" onChange={e => setEmail(e.target.value)} />
        <input type="password" className="login-input" placeholder="Password" onChange={e => setPassword(e.target.value)} />
        <button className="login-btn-submit" onClick={() => handleAuth('LOGIN')}>Secure Login</button>
        <button onClick={() => setView('SIGNUP')} className="login-link">New Driver? Register here.</button>
      </div>
    </div>
  );

  if (view === 'SIGNUP') return (
    <div id="signup-screen" style={{display: 'block'}}>
      <h1 style={{fontSize: '24px', fontWeight: '800'}}>Driver Registration</h1>
      <div className="section-title">Personal Details</div>
      <input type="text" className="input-field" placeholder="Full Name" onChange={e => setFullName(e.target.value)} />
      <input type="tel" className="input-field" placeholder="Phone Number" onChange={e => setPhone(e.target.value)} />
      <div className="section-title">Account Security</div>
      <input type="email" className="input-field" placeholder="Email Address" onChange={e => setEmail(e.target.value)} />
      <input type="password" className="input-field" placeholder="Create Password" onChange={e => setPassword(e.target.value)} />
      <button className="login-btn-submit" onClick={() => handleAuth('SIGNUP')}>Submit Registration</button>
      <button onClick={() => setView('LOGIN')} className="login-link" style={{width:'100%', marginTop: '15px'}}>Back to Login</button>
    </div>
  );

  if (view === 'PENDING') return (
    <div id="pending-approval-screen" style={{display: 'block'}}>
       <h1 style={{fontSize: '24px', fontWeight: '800'}}>Reviewing Profile</h1>
       <p style={{color: '#6b7280', marginTop: '10px'}}>Our team is verifying your documents. Check back soon!</p>
       <button onClick={handleLogout} className="btn-outline" style={{marginTop: '30px', width: '100%'}}>Log Out</button>
    </div>
  );

  return (
    <div id="dashboard" style={{display: 'block'}}>
      
      {/* HEADER */}
      <div className="header">
        <h1 style={{fontSize: '18px', fontWeight: '800'}}>Bofelo Driver</h1>
        <div className="header-right">
            <div className="status"><div className="dot"></div> Online</div>
            <button className="btn-logout" onClick={() => setShowProfile(true)}>Profile</button>
        </div>
      </div>

      <div className="container">
        
        {/* ACTIVE ORDERS */}
        <div className="section-title">Active Deliveries</div>
        {activeOrders.length === 0 ? (
            <div className="empty-placeholder"><p className="empty-placeholder-title">No active orders</p></div>
        ) : (
            activeOrders.map(o => (
                <div key={o.id} className="order-card">
                    <div className="card-top">
                        <div className="price">M {o.fee}</div>
                        <div className="status-pill status-active">IN PROGRESS</div>
                    </div>
                    <div className="btn-row" style={{marginTop: '15px'}}>
                        <a href={`https://www.google.com/maps/search/?api=1&query=$$${encodeURIComponent(o.dropoff)}`} target="_blank" className="btn-outline">🗺 Navigate</a>
                        <button className="btn-outline" onClick={() => setChatOrderId(o.id)}>💬 Chat & Call</button>
                    </div>
                    <button className="btn-complete" onClick={() => completeOrder(o.id, o.fee)}>Complete Delivery (PIN)</button>
                </div>
            ))
        )}

        {/* PENDING QUEUE */}
        <div className="section-title">New Requests</div>
        {activeOrders.length > 0 ? (
            <div className="empty-placeholder"><p>Complete your active delivery to see new requests.</p></div>
        ) : pendingOrders.length === 0 ? (
            <div className="empty-placeholder"><p className="empty-placeholder-title">Waiting for orders...</p></div>
        ) : (
            <div className="order-card">
                <div className="card-top">
                    <div className="price">M {pendingOrders[0].fee}</div>
                    <div className="status-pill status-new">NEW</div>
                </div>
                <div className="btn-row" style={{marginTop: '15px'}}>
                    <button className="btn-complete" onClick={() => acceptOrder(pendingOrders[0].id)}>Accept Order</button>
                </div>
            </div>
        )}
      </div>

      {/* PROFILE MODAL */}
      {showProfile && (
          <div id="profile-modal" style={{ display: 'block', padding: '20px', background: 'white', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 3000 }}>
              <div className="header" style={{boxShadow: 'none', padding: '0 0 20px 0'}}>
                  <h2>Profile & Wallet</h2>
                  <button onClick={() => setShowProfile(false)} style={{background:'none', border:'none', fontSize:'24px'}}>×</button>
              </div>
              <div className="order-card" style={{background: '#111827', color: 'white'}}>
                  <p style={{color: '#9ca3af', margin:0}}>Available to Withdraw (M-PESA)</p>
                  <h1 style={{color: '#4ade80', fontSize: '36px', margin: '10px 0'}}>M {walletBalance.toFixed(2)}</h1>
                  <button onClick={requestWithdrawal} className="btn-complete" style={{background: 'white', color: '#111827'}}>Withdraw Earnings</button>
              </div>
              <button onClick={handleLogout} className="btn-outline" style={{width: '100%', color: 'red', borderColor: 'red'}}>Secure Log Out</button>
          </div>
      )}

      {/* CHAT MODAL PLACEHOLDER */}
      {chatOrderId && (
          <div id="chat-modal" style={{ display: 'block' }}>
              <div className="chat-container" style={{ background: 'white', height: '90%', borderRadius: '20px 20px 0 0', padding: '20px' }}>
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                      <h3>Secure Chat & Call</h3>
                      <button onClick={() => setChatOrderId(null)} style={{background:'none', border:'none', fontSize:'24px'}}>×</button>
                  </div>
                  <p>Chat engine integrated here for Order ID: {chatOrderId}</p>
              </div>
          </div>
      )}

    </div>
  );
}

