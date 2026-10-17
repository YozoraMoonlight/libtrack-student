import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Keyboard, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface QrScannerProps {
    isOpen: boolean;
    onClose: () => void;
    onScan: (decodedText: string) => void;
    title?: string;
}

function safeStop(scanner: any) {
    try {
        const state = scanner?.getState?.();
        console.log('[QrScanner] safeStop called, state:', state);
        // 2 = SCANNING, 3 = PAUSED
        if (state === 2 || state === 3) {
            return scanner.stop().catch((e: any) => {
                console.warn('[QrScanner] stop() failed:', e);
            });
        }
    } catch (e) {
        console.warn('[QrScanner] safeStop error:', e);
    }
    return Promise.resolve();
}

export default function QrScanner({ isOpen, onClose, onScan, title = 'Scan QR Code' }: QrScannerProps) {
    const [mode, setMode] = useState<'camera' | 'manual'>('camera');
    const [manualInput, setManualInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const scannerRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen || mode !== 'camera') return;

        let html5QrCode: any = null;
        let cancelled = false;

        const initScanner = async () => {
            setLoading(true);
            setError(null);
            console.log('[QrScanner] Initializing camera scanner...');

            try {
                const { Html5Qrcode } = await import('html5-qrcode');
                if (cancelled || !containerRef.current) {
                    console.log('[QrScanner] Cancelled or container missing, aborting init');
                    setLoading(false);
                    return;
                }

                html5QrCode = new Html5Qrcode('qr-reader');
                scannerRef.current = html5QrCode;

                // Get available cameras
                const cameras = await Html5Qrcode.getCameras();
                console.log('[QrScanner] Available cameras:', cameras.length, cameras);

                if (cancelled) {
                    setLoading(false);
                    return;
                }

                if (!cameras || cameras.length === 0) {
                    console.warn('[QrScanner] No cameras found');
                    setLoading(false);
                    setError('No cameras found on this device. Use manual input.');
                    setMode('manual');
                    return;
                }

                // Try environment camera first, fall back to first available camera
                const cameraConfig = cameras.length === 1
                    ? { deviceId: cameras[0].id }
                    : { facingMode: 'environment' };

                console.log('[QrScanner] Starting with config:', cameraConfig);

                await html5QrCode.start(
                    cameraConfig,
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText: string) => {
                        console.log('[QrScanner] QR decoded:', decodedText);
                        onScan(decodedText);
                        safeStop(html5QrCode);
                        onClose();
                    },
                    () => {},
                );

                console.log('[QrScanner] Camera started successfully, state:', html5QrCode.getState?.());
                setLoading(false);
            } catch (err: any) {
                console.error('[QrScanner] Camera init failed:', err?.message || err);
                if (!cancelled) {
                    setLoading(false);
                    setError(`Camera error: ${err?.message || 'Unknown error'}. Use manual input.`);
                    setMode('manual');
                }
            }
        };

        // Delay to ensure the DOM container is rendered
        const timer = setTimeout(initScanner, 200);

        return () => {
            cancelled = true;
            clearTimeout(timer);
            console.log('[QrScanner] Cleanup triggered');
            if (html5QrCode) {
                safeStop(html5QrCode);
            }
        };
    }, [isOpen, mode]);

    const handleManualSubmit = () => {
        if (manualInput.trim()) {
            console.log('[QrScanner] Manual submit:', manualInput.trim());
            onScan(manualInput.trim());
            setManualInput('');
            onClose();
        }
    };

    const handleClose = () => {
        console.log('[QrScanner] Dialog closing');
        safeStop(scannerRef.current);
        setManualInput('');
        setError(null);
        setLoading(false);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription className="sr-only">
                        Scan a QR code using your camera or enter the code manually.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex gap-2 mb-4">
                    <Button
                        variant={mode === 'camera' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => { setMode('camera'); setError(null); }}
                    >
                        <Camera size={16} className="mr-2" />
                        Camera
                    </Button>
                    <Button
                        variant={mode === 'manual' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMode('manual')}
                    >
                        <Keyboard size={16} className="mr-2" />
                        Manual
                    </Button>
                </div>

                {mode === 'camera' && (
                    <div>
                        {loading && (
                            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p className="text-sm">Starting camera...</p>
                            </div>
                        )}
                        <div
                            id="qr-reader"
                            ref={containerRef}
                            className="w-full overflow-hidden rounded-lg"
                            style={{ minHeight: loading ? 0 : 300 }}
                        />
                        {error && (
                            <p className="text-sm text-red-500 mt-2">{error}</p>
                        )}
                    </div>
                )}

                {mode === 'manual' && (
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="qr-manual">Enter QR Code Data</Label>
                            <Input
                                id="qr-manual"
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="LIBTRACK:COPY:uuid or LIBTRACK:USER:uuid"
                                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                            />
                        </div>
                        <Button onClick={handleManualSubmit} disabled={!manualInput.trim()} className="w-full">
                            Submit
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
