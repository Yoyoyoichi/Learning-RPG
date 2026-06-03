import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{color:'red', padding:'20px', background:'#fff'}}>
          <h1>Error Occurred</h1>
          <pre style={{whiteSpace:'pre-wrap'}}>{this.state.error?.toString()}</pre>
          <pre style={{whiteSpace:'pre-wrap', fontSize:'0.8em'}}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children; 
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
