import React, { useState, useEffect } from 'react';
import { audio } from '../../utils/audio';

export default function SettingsMenu({ onClose, videoSettings, setVideoSettings }) {
    const [activeTab, setActiveTab] = useState('audio');

    // Load initial audio settings from localStorage or defaults
    const [audioSettings, setAudioSettings] = useState(() => {
        const saved = localStorage.getItem('puckoff_audio_settings');
        return saved ? JSON.parse(saved) : { master: 0.5, music: 0.3, sfx: 0.8 };
    });

    useEffect(() => {
        localStorage.setItem('puckoff_audio_settings', JSON.stringify(audioSettings));
        // Apply to audio engine
        audio.setMasterVolume(audioSettings.master);
        audio.setMusicVolume(audioSettings.music);
        audio.setSFXVolume(audioSettings.sfx);
    }, [audioSettings]);

    const handleAudioChange = (key, val) => {
        setAudioSettings(prev => ({ ...prev, [key]: parseFloat(val) }));
    };

    const handleVideoChange = (key, val) => {
        const newSettings = { ...videoSettings, [key]: val };
        setVideoSettings(newSettings);
        localStorage.setItem('puckoff_video_settings', JSON.stringify(newSettings));
    };

    return (
        <div className="settings-overlay glass-blur" onClick={onClose}>
            <div className="settings-modal glass-dark" onClick={e => e.stopPropagation()}>
                <div className="settings-header">
                    <h2>SETTINGS</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="settings-tabs">
                    <button
                        className={`tab-btn ${activeTab === 'audio' ? 'active' : ''}`}
                        onClick={() => { audio.playClick(); setActiveTab('audio'); }}
                    >
                        AUDIO
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'video' ? 'active' : ''}`}
                        onClick={() => { audio.playClick(); setActiveTab('video'); }}
                    >
                        VIDEO
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'controls' ? 'active' : ''}`}
                        onClick={() => { audio.playClick(); setActiveTab('controls'); }}
                    >
                        CONTROLS
                    </button>
                </div>

                <div className="settings-content">
                    {activeTab === 'audio' && (
                        <div className="settings-pane">
                            <div className="setting-row">
                                <label>Master Volume</label>
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={audioSettings.master}
                                    onChange={(e) => handleAudioChange('master', e.target.value)}
                                />
                                <span className="val-text">{Math.round(audioSettings.master * 100)}%</span>
                            </div>
                            <div className="setting-row">
                                <label>Music Volume</label>
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={audioSettings.music}
                                    onChange={(e) => handleAudioChange('music', e.target.value)}
                                />
                                <span className="val-text">{Math.round(audioSettings.music * 100)}%</span>
                            </div>
                            <div className="setting-row">
                                <label>SFX Volume</label>
                                <input
                                    type="range" min="0" max="1" step="0.01"
                                    value={audioSettings.sfx}
                                    onChange={(e) => handleAudioChange('sfx', e.target.value)}
                                />
                                <span className="val-text">{Math.round(audioSettings.sfx * 100)}%</span>
                            </div>
                        </div>
                    )}

                    {activeTab === 'video' && (
                        <div className="settings-pane">
                            <div className="setting-row toggle">
                                <label>Bloom (Glow)</label>
                                <input
                                    type="checkbox"
                                    checked={videoSettings.bloom !== false}
                                    onChange={(e) => handleVideoChange('bloom', e.target.checked)}
                                />
                            </div>
                            <div className="setting-row toggle">
                                <label>High Quality Shadows</label>
                                <input
                                    type="checkbox"
                                    checked={videoSettings.shadows !== false}
                                    onChange={(e) => handleVideoChange('shadows', e.target.checked)}
                                />
                            </div>
                            <div className="setting-row toggle">
                                <label>Chromatic Aberration</label>
                                <input
                                    type="checkbox"
                                    checked={videoSettings.chromaticAberration !== false}
                                    onChange={(e) => handleVideoChange('chromaticAberration', e.target.checked)}
                                />
                            </div>
                            <div className="setting-row">
                                <label>Graphics Preset</label>
                                <select
                                    value={videoSettings.preset || 'high'}
                                    onChange={(e) => handleVideoChange('preset', e.target.value)}
                                >
                                    <option value="low">Potato Mode</option>
                                    <option value="med">Medium Performance</option>
                                    <option value="high">AAA Experience</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {activeTab === 'controls' && (
                        <div className="settings-pane controls-list">
                            <div className="control-item"><span>WASD / Arrows</span> <kbd>Move Puck</kbd></div>
                            <div className="control-item"><span>SPACE</span> <kbd>Use Powerup Slot 1</kbd></div>
                            <div className="control-item"><span>1, 2, 3</span> <kbd>Quick Loadout Slot</kbd></div>
                            <div className="control-item"><span>SHIFT</span> <kbd>Drift / Air Dodge</kbd></div>
                            <div className="control-item"><span>ESC</span> <kbd>Pause / Menu</kbd></div>
                        </div>
                    )}
                </div>

                <div className="settings-footer">
                    <button className="btn btn-primary" onClick={onClose}>SAVE & CLOSE</button>
                </div>
            </div>

            <style>{`
                .settings-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.6);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 2000;
                    backdrop-filter: blur(8px);
                }
                .settings-modal {
                    width: 90%; max-width: 500px;
                    padding: 2rem; border-radius: 20px;
                    border: 1px solid rgba(255,255,255,0.2);
                    display: flex; flex-direction: column; gap: 1.5rem;
                }
                .settings-header {
                    display: flex; justify-content: space-between; align-items: center;
                }
                .settings-header h2 { margin: 0; font-size: 1.5rem; letter-spacing: 2px; color: #00d4ff; }
                .close-btn { 
                    background: none; border: none; font-size: 2rem; color: #666; cursor: pointer;
                    line-height: 1; transition: color 0.2s;
                }
                .close-btn:hover { color: white; }

                .settings-tabs {
                    display: flex; gap: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.1);
                    padding-bottom: 1rem;
                }
                .tab-btn {
                    flex: 1; padding: 0.6rem; border-radius: 10px;
                    background: rgba(255,255,255,0.05); border: 1px solid transparent;
                    color: #888; font-weight: bold; cursor: pointer; transition: all 0.2s;
                    font-size: 0.8rem;
                }
                .tab-btn.active {
                    background: rgba(0,212,255,0.15); border-color: #00d4ff; color: #00d4ff;
                }

                .settings-content { min-height: 250px; }
                .settings-pane { display: flex; flex-direction: column; gap: 1rem; }
                
                .setting-row {
                    display: flex; align-items: center; gap: 1rem;
                    background: rgba(255,255,255,0.02); padding: 0.8rem 1rem;
                    border-radius: 12px;
                }
                .setting-row label { flex: 1; font-size: 0.9rem; color: #ccc; }
                .setting-row input[type="range"] { flex: 2; height: 6px; border-radius: 3px; accent-color: #00d4ff; }
                .setting-row select { background: #222; border: 1px solid #444; color: white; padding: 5px 10px; border-radius: 6px; }
                .val-text { width: 40px; text-align: right; font-size: 0.8rem; color: #00d4ff; font-family: monospace; }

                .setting-row.toggle { justify-content: space-between; }
                .setting-row.toggle input[type="checkbox"] {
                    width: 40px; height: 20px; appearance: none;
                    background: #333; border-radius: 10px; position: relative;
                    cursor: pointer; transition: 0.3s;
                }
                .setting-row.toggle input[type="checkbox"]:checked { background: #00ff87; }
                .setting-row.toggle input[type="checkbox"]::after {
                    content: ''; position: absolute; top: 2px; left: 2px;
                    width: 16px; height: 16px; background: white; border-radius: 50%;
                    transition: 0.3s;
                }
                .setting-row.toggle input[type="checkbox"]:checked::after { left: 22px; }

                .controls-list { gap: 0.5rem; }
                .control-item {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 0.6rem 1rem; background: rgba(0,0,0,0.2); border-radius: 8px;
                    font-size: 0.85rem;
                }
                .control-item kbd {
                    background: #444; color: #00d4ff; padding: 2px 8px; border-radius: 4px;
                    font-family: monospace; box-shadow: 0 2px 0 #222;
                }

                .settings-footer { margin-top: 1rem; display: flex; justify-content: flex-end; }
                .btn-primary { 
                    padding: 0.8rem 2rem; border-radius: 30px; border: none;
                    background: linear-gradient(45deg, #00d4ff, #00ff87);
                    color: #000; font-weight: bold; cursor: pointer;
                    box-shadow: 0 4px 15px rgba(0,212,255,0.3);
                }
            `}</style>
        </div>
    );
}
