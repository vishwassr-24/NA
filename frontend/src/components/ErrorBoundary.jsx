import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('NEXUS AQUA caught an unhandled rendering error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#050a14',
          color: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}>
          <div style={{
            maxWidth: '560px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.2)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              color: '#ef4444'
            }}>
              <AlertTriangle style={{ width: '28px', height: '28px' }} />
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>
              Application Render Notice
            </h2>
            <p style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px', lineHeight: '1.5' }}>
              A rendering exception occurred in this view. Details are captured below:
            </p>
            <div style={{
              backgroundColor: '#0a0f1e',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'left',
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#f87171',
              maxHeight: '160px',
              overflow: 'auto',
              marginBottom: '24px',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => {
                localStorage.clear()
                window.location.href = '/'
              }}
              style={{
                backgroundColor: '#0284c7',
                color: '#ffffff',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <RefreshCw style={{ width: '16px', height: '16px' }} /> Reset & Reload Portal
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
