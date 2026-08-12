// Live Firebase Configuration for Cyber Store Admin
const firebaseConfig = {
    apiKey: "AIzaSyDUowN2gw6HvlBooZw2VDbroabjGhjMlRM",
    authDomain: "cyber-store-b2668.firebaseapp.com",
    projectId: "cyber-store-b2668",
    storageBucket: "cyber-store-b2668.firebasestorage.app",
    messagingSenderId: "1014814260411",
    appId: "1:1014814260411:web:c7adff1a39026e8fd53d9e",
    measurementId: "G-4HP0L2KV1Q"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("searchOrderBtn");
    const searchInput = document.getElementById("searchOrderId");
    const resultContainer = document.getElementById("orderResultContainer");

    if (searchBtn) {
        searchBtn.onclick = async () => {
            const orderId = searchInput.value.trim().toUpperCase();
            
            if (!orderId) {
                alert("Please enter a valid Order ID.");
                return;
            }

            // Show loading state
            resultContainer.style.display = "block";
            resultContainer.innerHTML = `<p style="text-align: center; color: #888;">Searching database for ${orderId}...</p>`;

            try {
                const doc = await db.collection("orders").doc(orderId).get();
                
                if (doc.exists) {
                    const order = doc.data();
                    
                    // Format the purchased items list
                    let itemsHtml = order.items.map(item => `
                        <li style="margin-bottom: 5px;">
                            ${item.name} <span style="color: #aaa; font-size: 11px;">(Rs. ${item.price})</span>
                            <br><span style="font-size: 11px; color: var(--neon-purple);">${item.details || item.email || ''}</span>
                        </li>
                    `).join('');

                    // Determine status color
                    let statusColor = '#ffaa00'; // Default Pending (Orange)
                    if (order.status === 'COMPLETED') statusColor = '#00ff66'; // Green
                    if (order.status === 'CANCELLED') statusColor = '#ff0055'; // Red

                    // Inject the order details UI
                    resultContainer.innerHTML = `
                        <h3 style="color: var(--neon-purple); margin-bottom: 15px; border-bottom: 1px solid rgba(176,38,255,0.3); padding-bottom: 10px;">Order Details: ${order.orderId}</h3>
                        
                        <div style="font-size: 14px; line-height: 1.8; margin-bottom: 20px;">
                            <p><strong>Customer Phone:</strong> ${order.phone}</p>
                            <p><strong>Transaction UTR:</strong> <span style="color: #fff;">${order.utr}</span></p>
                            <p><strong>Total Amount:</strong> Rs. ${order.total}</p>
                            <p><strong>Current Status:</strong> <span style="color: ${statusColor}; font-weight: bold; background: ${statusColor}22; padding: 2px 8px; border-radius: 4px;">${order.status}</span></p>
                        </div>
                        
                        <p style="margin-bottom: 8px; font-weight: bold; color: #b39ddb;">Purchased Items:</p>
                        <ul style="margin-left: 20px; color: #d1c4e9; font-size: 13px; margin-bottom: 25px;">
                            ${itemsHtml}
                        </ul>

                        <div style="display: flex; gap: 10px;">
                            <button onclick="updateOrderStatus('${order.orderId}', 'COMPLETED')" class="cyber-btn" style="flex: 1; background: #00ff6622; color: #00ff66; border-color: #00ff66;">Mark Complete</button>
                            <button onclick="updateOrderStatus('${order.orderId}', 'CANCELLED')" class="cyber-btn" style="flex: 1; background: #ff005522; color: #ff0055; border-color: #ff0055;">Cancel Order</button>
                            <button onclick="updateOrderStatus('${order.orderId}', 'PENDING')" class="cyber-btn" style="flex: 1; background: #ffaa0022; color: #ffaa00; border-color: #ffaa00;">Mark Pending</button>
                        </div>
                    `;
                } else {
                    resultContainer.innerHTML = `<p style="color: var(--danger-color); text-align: center; font-weight: bold;">❌ Order not found. Please check the Order ID and try again.</p>`;
                }
            } catch (e) {
                resultContainer.innerHTML = `<p style="color: var(--danger-color); text-align: center;">Error fetching order data from database.</p>`;
            }
        };
    }
});

// Global function to update the status and automatically refresh the search result
window.updateOrderStatus = async function(orderId, status) {
    try {
        await db.collection("orders").doc(orderId).update({ status });
        alert(`Successfully updated Order ${orderId} to ${status}`);
        
        // Auto-click the search button to refresh the UI immediately
        document.getElementById("searchOrderBtn").click(); 
    } catch (e) {
        alert("Failed to update the order status.");
    }
};
