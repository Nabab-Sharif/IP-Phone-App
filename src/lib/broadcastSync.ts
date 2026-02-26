// Broadcast channel for cross-tab synchronization
let broadcastChannel: BroadcastChannel | null = null;

export function initBroadcastChannel() {
  try {
    broadcastChannel = new BroadcastChannel('phone-directory-sync');
  } catch {
    console.warn('BroadcastChannel not supported');
  }
}

export function broadcastDataChange(type: 'office' | 'department' | 'entry' | 'access_code') {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type: 'data-change', dataType: type, timestamp: Date.now() });
  }
}

export function onDataChange(callback: (type: string) => void) {
  if (!broadcastChannel) {
    initBroadcastChannel();
  }
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data.type === 'data-change') {
        callback(event.data.dataType);
      }
    };
  }
}

export function closeBroadcastChannel() {
  if (broadcastChannel) {
    broadcastChannel.close();
    broadcastChannel = null;
  }
}
