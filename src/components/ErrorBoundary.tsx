import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Luganda Buddy] App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center bg-[#0e0e12] px-6 text-center">
          <p className="text-4xl">😔</p>
          <h1 className="mt-4 font-display text-2xl font-semibold text-white">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-sm text-sm font-medium text-[#8b8b9e]">
            The app hit a storage problem. Tap below to reset and try again.
          </p>
          <button
            type="button"
            onClick={() => {
              try {
                localStorage.removeItem('luganda-buddy-audio-v1')
              } catch {
                // ignore
              }
              window.location.reload()
            }}
            className="mt-6 rounded-2xl bg-violet px-6 py-3 font-bold text-white"
          >
            Reset & reload
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
