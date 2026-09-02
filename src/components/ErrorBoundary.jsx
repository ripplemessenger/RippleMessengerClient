import React from 'react'
import Logger from '../lib/Logger'
import i18n from '../i18n'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    Logger.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 rounded-xl border border-primary/20 dark:border-primary/30 bg-gradient-card dark:bg-dark-gradient-card shadow-gold">
          <h2 className="text-xl font-bold text-text-primary dark:text-dark-text-primary mb-2">
            {this.props.fallbackTitle || i18n.t('common.error')}
          </h2>
          <p className="text-sm text-text-secondary dark:text-dark-text-secondary mb-4">
            {this.state.error?.message || i18n.t('common.unknown_error')}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 rounded-lg text-white bg-primary hover:bg-primary-dark transition-all shadow-gold hover:shadow-gold-lg active:scale-95"
          >
            {this.props.resetText || i18n.t('common.try_again')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
