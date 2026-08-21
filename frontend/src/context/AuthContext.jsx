import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore user session from localStorage
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login/', { username, password });
      const { access, user: userData } = response.data;
      
      localStorage.setItem('token', access);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true, user: userData };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Invalid username or password' 
      };
    }
  };

  const register = async (signUpData) => {
    try {
      const response = await api.post('/auth/register/', signUpData);
      return { success: true, user: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { error: 'Registration failed. Check details.' } 
      };
    }
  };

  const verifyOtp = async (phone, otp) => {
    try {
      const response = await api.post('/auth/verify-otp/', { phone, otp });
      const { user: verifiedUser } = response.data;
      // update state if this is current user
      if (user && user.phone === phone) {
        const updated = { ...user, is_verified: true };
        localStorage.setItem('user', JSON.stringify(updated));
        setUser(updated);
      }
      return { success: true, message: response.data.message };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Invalid OTP verification' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const submitKyc = async (kycDoc) => {
    try {
      const response = await api.post('/farmer/kyc/', { kyc_document: kycDoc });
      const updatedUser = response.data.user;
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'KYC submission failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, register, verifyOtp, logout, submitKyc }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
