import React from 'react';
import FarmerProfileSection from '../components/FarmerProfileSection';

const FarmerProfilePage = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FarmerProfileSection />
      </div>
    </div>
  );
};

export default FarmerProfilePage;
