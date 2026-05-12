import { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut } from 'aws-amplify/auth';
import './App.css';

// Configure AWS
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);

export default function App() {
  const [view, setView] = useState('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAuth = async (type: string) => {
    try {
      if (type === 'SIGNUP') {
        await signUp({ 
            username: email, 
            password,
            options: { userAttributes: { email, name } }
        });
        setView('PENDING');
      } else {
        await signIn({ username: email, password });
        setView('DASHBOARD');
      }
    } catch (e: any) { 
      alert("Error: " + e.message); 
    }
  };

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
      <input type="text" className="input-field" placeholder="Full Name" onChange={e => setName(e.target.value)} />
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
       <button onClick={() => setView('LOGIN')} className="btn-outline" style={{marginTop: '30px', width: '100%'}}>Log Out</button>
    </div>
  );

  return (
    <div id="dashboard" style={{display: 'block'}}>
      <div className="header">
        <h1 style={{fontSize: '18px', fontWeight: '800'}}>Bofelo Driver</h1>
        <button className="btn-logout" onClick={() => { signOut(); setView('LOGIN'); }}>Logout</button>
      </div>
      <div className="container">
        <div className="section-title">Active Deliveries</div>
        <div className="order-card">
            <div className="card-top">
                <span className="price">M 0.00</span>
                <span className="status-pill status-new">No Orders</span>
            </div>
            <div className="empty-placeholder">
              <p className="empty-placeholder-title">Waiting for orders...</p>
            </div>
        </div>
      </div>
    </div>
  );
}
