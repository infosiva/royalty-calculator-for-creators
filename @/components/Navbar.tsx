import React, { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Error: Navbar could not be rendered.</div>;
    }

    return this.props.children;
  }
}

const Navbar = () => {
  // ... existing Navbar component code
};

return (
  <ErrorBoundary>
    <Navbar />
  </ErrorBoundary>
);