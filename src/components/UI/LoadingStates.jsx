import React from 'react';
import SkeletonLoader from './SkeletonLoader';
import './LoadingStates.css';

/**
 * Loading state components for various UI sections
 */

// Store loading state
export function StoreLoadingState() {
    return (
        <div className="store-loading">
            <div className="store-loading-header">
                <SkeletonLoader width="60%" height="2rem" />
            </div>
            <div className="store-loading-grid">
                {Array(6).fill(0).map((_, i) => (
                    <div key={i} className="store-item-skeleton">
                        <SkeletonLoader height="120px" />
                        <SkeletonLoader width="80%" height="1.2rem" style={{ marginTop: '0.5rem' }} />
                        <SkeletonLoader width="40%" height="1rem" style={{ marginTop: '0.25rem' }} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// Icon picker loading state
export function IconPickerLoadingState() {
    return (
        <div className="icon-picker-loading">
            <SkeletonLoader width="50%" height="1.5rem" style={{ marginBottom: '1rem' }} />
            <div className="icon-grid-skeleton">
                {Array(12).fill(0).map((_, i) => (
                    <SkeletonLoader
                        key={i}
                        width="64px"
                        height="64px"
                        variant="circle"
                    />
                ))}
            </div>
        </div>
    );
}

// Pack opening loading state
export function PackOpeningLoadingState() {
    return (
        <div className="pack-opening-loading">
            <div className="pack-skeleton">
                <SkeletonLoader width="200px" height="280px" />
            </div>
            <SkeletonLoader width="150px" height="1.5rem" style={{ marginTop: '1rem' }} />
            <SkeletonLoader width="100px" height="1rem" style={{ marginTop: '0.5rem' }} />
        </div>
    );
}

// Lobby loading state
export function LobbyLoadingState() {
    return (
        <div className="lobby-loading">
            <SkeletonLoader width="200px" height="3rem" style={{ margin: '0 auto 2rem' }} />
            <div className="lobby-players-skeleton">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="player-skeleton">
                        <SkeletonLoader width="48px" height="48px" variant="circle" />
                        <SkeletonLoader width="100px" height="1rem" />
                    </div>
                ))}
            </div>
            <SkeletonLoader width="200px" height="50px" style={{ margin: '2rem auto' }} />
        </div>
    );
}

// Generic loading overlay with message
export function LoadingOverlay({ message = 'Loading...', subMessage = '' }) {
    return (
        <div className="loading-overlay-full">
            <div className="loading-content">
                <div className="loading-spinner-large" />
                <p className="loading-message">{message}</p>
                {subMessage && <p className="loading-sub-message">{subMessage}</p>}
            </div>
        </div>
    );
}

// Button loading state
export function ButtonLoading({ children, loading, ...props }) {
    return (
        <button {...props} disabled={loading || props.disabled}>
            {loading ? (
                <span className="button-spinner" />
            ) : (
                children
            )}
        </button>
    );
}
