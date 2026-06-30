import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { HashRouter as Router } from 'react-router-dom'

import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { AuthProvider } from './contexts/AuthProvider'
import { store } from './store'

import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary fallbackTitle="Application Error">
      <Provider store={store}>
        <Router>
          <AuthProvider>
            <App />
          </AuthProvider>
        </Router>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
)