import React, { useState } from 'react';
import { Amplify } from 'aws-amplify';
import { signIn, signUp, signOut } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/api';
import './App.css';

// 1. Setup AWS Connection
import outputs from '../amplify_outputs.json';
Amplify.configure(outputs);
const client = generateClient();

const App: React.FC = () => {
  // Navigation State: 'LOGIN', 'SIGNUP', 'PENDING', 'DASHBOARD'
  const [view, setView] = useState<string>('LOGIN');
  
  // Registration Form State
  const [formData, setFormData] = useState<any>({
    email: '', password: '', fullName: '', phone: '', plate: ''
  });

  const handleAuth = async (type: string) => {
    try {
      if (type === 'SIGNUP') {
        await signUp({ 
            username: formData.email, 
            password: formData.password,
            options: { userAttributes: { email: formData.email, name: formData.fullName } }
        });
        setView('PENDING');
      } else {
        await signIn({ username: formData.email, password: formData.password });
        setView('DASHBOARD');
      }
    } catch (e: any) { 
      alert("Error: " + e.message); 
    }
  };

  // --- 1. LOGIN SCREEN ---
  if (view === 'LOGIN') return (
    <div id="login-screen">
      <div className="login-card">
        <h1 className="login-title">Driver Portal Login</h1>
        <input type="email" className="login-input" placeholder="Driver Email" onChange={e => setFormData({...formData, email: e.target.value})} />
        <input type="password" class="login-input" placeholder="Password" onChange={e => setFormData({...formData, password: e.target.value})} />
        <button className="login-btn-submit" onClick={() => handleAuth('LOGIN')}>Secure Login</button>
        <button onClick={() => setView('SIGNUP')} className="login-link">New Driver? Register here.</button>
      </div>
    </div>
  );

  // --- 2. SIGNUP SCREEN ---
  if (view === 'SIGNUP') return (
    <div id="signup-screen" style={{display: 'block'}}>
      <h1 style={{fontSize: '24px', fontWeight: '800'}}>Driver Registration</h1>
      <div className="section-title">Personal Details</div>
      <input type="text" className="input-field" placeholder="Full Name" onChange={e => setFormData({...formData, fullName: e.target.value})} />
      <input type="tel" className="input-field" placeholder="Phone Number" onChange={e => setFormData({...formData, phone: e.target.value})} />
      <div className="section-title">Vehicle Info</div>
      <input type="text" className="input-field" placeholder="License Plate" onChange={e => setFormData({...formData, plate: e.target.value})} />
      <div className="section-title">Account Security</div>
      <input type="email" className="input-field" placeholder="Email Address" onChange={e => setFormData({...formData, email: e.target.value})} />
      <input type="password" class="input-field" placeholder="Create Password" onChange={e => setFormData({...formData, password: e.target.value})} />
      <button className="login-btn-submit" onClick={() => handleAuth('SIGNUP')}>Submit Registration</button>
      <button onClick={() => setView('LOGIN')} className="login-link" style={{width:'100%', marginTop: '15px'}}>Back to Login</button>
    </div>
  );

  // --- 3. PENDING SCREEN ---
  if (view === 'PENDING') return (
    <div id="pending-approval-screen" style={{display: 'block'}}>
       <h1 style={{fontSize: '24px', fontWeight: '800'}}>Account Under Review</h1>
       <p style={{color: '#6b7280', marginTop: '10px'}}>Our admin team is currently reviewing your documents.</p>
       <button onClick={() => setView('LOGIN')} className="btn-outline" style={{marginTop: '30px', width: '100%'}}>Log Out</button>
    </div>
  );

  // --- 4. DASHBOARD ---
  return (
    <div id="dashboard" style={{display: 'block'}}>
      <div className="header">
        <h1 style={{fontSize: '18px', fontWeight: '800'}}>Bofelo Driver</h1>
        <div className="header-right">
            <div className="status"><div className="dot"></div> Online</div>
            <button className="btn-logout" onClick={() => { signOut(); setView('LOGIN'); }}>Logout</button>
        </div>
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

export default App;
