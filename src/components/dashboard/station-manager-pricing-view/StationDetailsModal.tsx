'use client';

import { X, MapPin, User, Tag } from 'lucide-react';
import styles from '../station-manager-view/ManagerOverview.module.css';

interface StationDetails {
    id: number;
    name: string;
    brand: string;
    address: string;
    state: string;
    price_pms: number;
    price_ago: number;
    price_dpk: number;
    manager?: {
        full_name: string;
        phone_number: string;
    };
}

interface StationDetailsModalProps {
    station: StationDetails | null;
    onClose: () => void;
}

export default function StationDetailsModal({ station, onClose }: StationDetailsModalProps) {
    if (!station) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))' }}>
                <header className={styles.modalHeader} style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <div className={styles.modalTitle}>
                        <div className={styles.promoIcon} style={{ width: '40px', height: '40px', background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
                            <Tag size={20} />
                        </div>
                        <div>
                            <h3>{station.name}</h3>
                            <span className="text-sm text-muted-foreground">
                                {station.brand || 'Independent Station'}
                            </span>
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} style={{ color: 'hsl(var(--muted-foreground))' }}>
                        <X size={20} />
                    </button>
                </header>

                <div className={styles.modalBody}>
                    <section className={styles.modalSection}>
                        <h4><MapPin size={16} /> Location Info</h4>
                        <div className={styles.detailCard} style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                            <p><strong>Address:</strong> {station.address ? station.address.replace(/^[A-Z0-9]{4}\+[A-Z0-9]{2,3}(?:,\s*)?/i, '') : 'N/A'}</p>
                            <p><strong>State:</strong> {station.state}</p>
                        </div>
                    </section>

                    <section className={styles.modalSection}>
                        <h4><User size={16} /> Station Management</h4>
                        <div className={styles.detailCard} style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                            {station.manager ? (
                                <>
                                    <p><strong>Manager:</strong> {station.manager.full_name}</p>
                                    <p><strong>Contact:</strong> {station.manager.phone_number}</p>
                                </>
                            ) : (
                                <p className="text-muted-foreground italic">
                                    No manager registered on Fynd Fuel yet.
                                </p>
                            )}
                        </div>
                    </section>

                    <section className={styles.modalSection}>
                        <h4><Tag size={16} /> Current Price List</h4>
                        <div className={styles.priceGrid}>
                            <div className={styles.priceItem} style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                                <span className="text-muted-foreground">PMS (Petrol)</span>
                                <strong>₦{station.price_pms}</strong>
                            </div>
                            <div className={styles.priceItem} style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                                <span className="text-muted-foreground">AGO (Diesel)</span>
                                <strong>₦{station.price_ago}</strong>
                            </div>
                            <div className={styles.priceItem} style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                                <span className="text-muted-foreground">DPK (Kerosene)</span>
                                <strong>₦{station.price_dpk}</strong>
                            </div>
                        </div>
                    </section>
                </div>

                <footer className={styles.modalFooter} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                    <button className="btn-primary w-full" onClick={onClose}>
                        Close Profile
                    </button>
                </footer>
            </div>
        </div>
    );
}
