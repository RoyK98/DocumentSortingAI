#!/usr/bin/env node
/**
 * Document Sorting AI - Startup Script
 * This script helps you get the application running quickly.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function checkSetup() {
  console.log('🔍 Checking Document Sorting AI setup...');
  
  // Check if .env file exists
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) {
    console.log('❌ No .env file found!');
    console.log('\n📝 Setup Instructions:');
    console.log('1. Copy env_example.txt to .env');
    console.log('2. Add your OpenAI API key to the .env file');
    console.log('3. Get your API key from: https://platform.openai.com/api-keys');
    console.log('\nExample .env file:');
    console.log('OPENAI_API_KEY=your_actual_api_key_here');
    return false;
  }
  
  // Check if OpenAI API key is set
  require('dotenv').config();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey === 'your_openai_api_key_here') {
    console.log('❌ OpenAI API key not set in .env file!');
    console.log('Please add your actual API key to the .env file.');
    return false;
  }
  
  console.log('✅ Setup looks good!');
  return true;
}

function installDependencies() {
  console.log('📦 Installing dependencies...');
  try {
    // Install server dependencies
    console.log('Installing server dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    
    // Install client dependencies
    console.log('Installing client dependencies...');
    execSync('cd client && npm install', { stdio: 'inherit' });
    
    console.log('✅ Dependencies installed successfully!');
    return true;
  } catch (error) {
    console.log('❌ Failed to install dependencies!');
    console.log('Please run: npm run install-all');
    return false;
  }
}

function main() {
  console.log('🚀 Document Sorting AI - Startup');
  console.log('=' * 40);
  
  // Check if package.json exists
  if (!fs.existsSync(path.join(__dirname, 'package.json'))) {
    console.log('❌ package.json not found!');
    console.log('Please make sure you\'re in the correct directory.');
    return;
  }
  
  // Check if client/package.json exists
  if (!fs.existsSync(path.join(__dirname, 'client', 'package.json'))) {
    console.log('❌ client/package.json not found!');
    console.log('Please make sure the React client is properly set up.');
    return;
  }
  
  // Install dependencies if needed
  try {
    require('express');
    console.log('✅ Dependencies already installed');
  } catch (error) {
    if (!installDependencies()) {
      return;
    }
  }
  
  // Check setup
  if (!checkSetup()) {
    return;
  }
  
  console.log('\n🎉 Ready to start!');
  console.log('Starting Document Sorting AI...');
  console.log('🌐 React app will open at: http://localhost:3000');
  console.log('🔧 API server will run at: http://localhost:5000');
  console.log('⏹️  Press Ctrl+C to stop the servers');
  console.log('-'.repeat(40));
  
  // Start the application
  try {
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    if (error.signal === 'SIGINT') {
      console.log('\n👋 Goodbye!');
    } else {
      console.log(`❌ Error starting application: ${error.message}`);
    }
  }
}

if (require.main === module) {
  main();
} 