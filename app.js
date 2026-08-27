// ==========================================
// 🔥 YOUR LIVE FIREBASE CONFIGURATION 🔥
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDUowN2gw6HvlBooZw2VDbroabjGhjMlRM",
    authDomain: "cyber-store-b2668.firebaseapp.com",
    projectId: "cyber-store-b2668",
    storageBucket: "cyber-store-b2668.firebasestorage.app",
    messagingSenderId: "1014814260411",
    appId: "1:1014814260411:web:c7adff1a39026e8fd53d9e",
    measurementId: "G-4HP0L2KV1Q"
};
// ==========================================

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

let cart = [];
let activeDiscount = 0;
let activeGift = ""; 

// Fortified Event Listener to ensure DOM is fully loaded
window.addEventListener("load", () => {
    
    // Connect custom support button to Voiceflow widget
    const supportBtn = document.getElementById('aiSupportFloatBtn');
    if (supportBtn) {
        supportBtn.addEventListener('click', () => {
            if (window.voiceflow && window.voiceflow.chat) {
                window.voiceflow.chat.open();
            } else {
                console.warn("Voiceflow widget not yet loaded.");
            }
        });
    }

    // 1. Sync Live Ticker
    db.collection("settings").doc("ticker").onSnapshot((doc) => {
        if (doc.exists && doc.data().text) {
            const tickerEl = document.getElementById("tickerTextContent");
            if (tickerEl) tickerEl.innerHTML = doc.data().text;
        }
    });

    // 2. Load Dynamic Products from Firestore
    loadDynamicProducts();

    // 3. Auth Modal Triggers
    const loginBtn = document.getElementById("loginBtn");
    const authModal = document.getElementById("authModal");
    const closeModal = document.getElementById("closeModal");

    if (loginBtn && authModal) {
        loginBtn.addEventListener("click", () => {
            document.getElementById("loginStep").classList.remove("hidden");
            document.getElementById("profileStep").classList.add("hidden");
            authModal.classList.remove("hidden");
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener("click", () => {
            authModal.classList.add("hidden");
        });
    }

    // Google Sign-In Only
    const googleLoginBtn = document.getElementById("googleLoginBtn");
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", async () => {
            try {
                const result = await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
                checkUserProfile(result.user);
            } catch (err) { 
                alert("Google Sign-In Failed: " + err.message); 
            }
        });
    }

    const saveProfileBtn = document.getElementById("saveProfileBtn");
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener("click", async () => {
            const user = auth.currentUser;
            const name = document.getElementById("profileName").value.trim();
            const dob = document.getElementById("profileDob").value;
            if (!name || !dob) return alert("Please fill details.");
            
            const sixDigitId = Math.floor(100000 + Math.random() * 900000).toString();
            await db.collection("users").doc(user.uid).set({
                uid: user.uid, email: user.email, name, dob, sixDigitId, isBanned: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            authModal.classList.add("hidden");
            location.reload();
        });
    }

    // 4. Cart Modal Security Check
    const cartModal = document.getElementById("cartModal");
    const openCartBtn = document.getElementById("openCartBtn");
    if (openCartBtn) {
        openCartBtn.addEventListener("click", () => {
            if (!auth.currentUser) {
                alert("🔒 Access Denied: You must Login before accessing your cart!");
                authModal.classList.remove("hidden");
                return;
            }
            cartModal.classList.remove("hidden");
        });
    }
    const closeCartBtn = document.getElementById("closeCartModal");
    if(closeCartBtn) {
        closeCartBtn.addEventListener("click", () => {
            cartModal.classList.add("hidden");
        });
    }

    // 5. Instagram Calculator Logic
    const instaCountInput = document.getElementById("instaCount");
    const instaPriceSpan = document.getElementById("instaPrice");
    if (instaCountInput && instaPriceSpan) {
        instaCountInput.addEventListener("input", () => {
            let count = parseInt(instaCountInput.value) || 100;
            let price = count < 2000 ? (count / 100) * 7 : (count / 100) * 6;
            instaPriceSpan.innerText = Math.round(price);
        });
    }

    // 6. Instagram Buy Trigger
    const instaBuyTrigger = document.getElementById("instaBuyTrigger");
    if (instaBuyTrigger) {
        instaBuyTrigger.addEventListener("click", () => {
            if (!auth.currentUser) {
                alert("🔒 Sign In Required: Please log in to add this to your cart.");
                authModal.classList.remove("hidden");
                return;
            }
            const count = parseInt(instaCountInput.value) || 100;
            const username = document.getElementById("instaUsername").value.trim();
            if (!username) return alert("Please enter your Instagram username.");
            
            let price = count < 2000 ? (count / 100) * 7 : (count / 100) * 6;
            cart.push({ name: "Instagram Followers", price: Math.round(price), details: `${count} Followers (${username})`, email: username });
            updateCartUI();
            cartModal.classList.remove("hidden");
        });
    }

    // 7. Promo Code Application
    const applyPromoBtn = document.getElementById("applyPromoBtn");
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener("click", async () => {
            const code = document.getElementById("promoCodeInput").value.trim().toUpperCase();
            const feedback = document.getElementById("promoFeedback");
            if (!code) return;

            try {
                const doc = await db.collection("promos").doc(code).get();
                if (doc.exists) {
                    const promoData = doc.data();
                    if (promoData.targetSixId && promoData.targetSixId !== auth.currentUser.sixDigitId) {
                        feedback.style.color = "var(--danger-color)";
                        feedback.innerText = "This promo code is assigned to a different user.";
                        return;
                    }
                    activeDiscount = promoData.discountPercent || 0;
                    activeGift = promoData.freeGift || "";
                    
                    feedback.style.color = "var(--success-color)";
                    let successMsg = `Promo applied!`;
                    if (activeDiscount > 0) successMsg += ` ${activeDiscount}% OFF.`;
                    if (activeGift) successMsg += ` 🎁 Free Gift: ${activeGift}!`;
                    
                    feedback.innerText = successMsg;
                    updateCartUI();
                } else {
                    feedback.style.color = "var(--danger-color)";
                    feedback.innerText = "Invalid promo code.";
                }
            } catch (e) { feedback.style.color = "var(--danger-color)"; feedback.innerText = "Error applying code."; }
        });
    }

    // 8. Checkout / Submit
    const paymentModal = document.getElementById("paymentModal");
    const proceedBtn = document.getElementById("proceedToCheckoutBtn");
    if (proceedBtn) {
        proceedBtn.addEventListener("click", () => {
            if (cart.length === 0) return alert("Cart is empty!");
            cartModal.classList.add("hidden");
            paymentModal.classList.remove("hidden");
        });
    }
    const closePaymentBtn = document.getElementById("closePaymentModal");
    if(closePaymentBtn) {
        closePaymentBtn.addEventListener("click", () => {
            paymentModal.classList.add("hidden");
        });
    }

    const submitOrderBtn = document.getElementById("submitOrderBtn");
    if (submitOrderBtn) {
        submitOrderBtn.addEventListener("click", async () => {
            const phone = document.getElementById("customerPhone").value.trim();
            const utr = document.getElementById("utrInput").value.trim();
            if (phone.length !== 10) return alert("Valid 10-digit number required.");
            if (utr.length < 10) return alert("Valid UTR required.");

            const orderId = "#ORDER" + Math.floor(100000 + Math.random() * 900000);
            
            await db.collection("orders").doc(orderId).set({
                orderId, 
                userUid: auth.currentUser.uid, 
                phone, 
                utr, 
                items: cart, 
                total: calculateTotal(), 
                freeGift: activeGift, 
                status: "PENDING", 
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            alert(`Order submitted! ID: ${orderId}`);
            cart = []; 
            activeDiscount = 0; 
            activeGift = ""; 
            document.getElementById("promoFeedback").innerText = "";
            document.getElementById("promoCodeInput").value = "";
            updateCartUI(); 
            paymentModal.classList.add("hidden");
        });
    }

    // 9. Real-time User Listener
    auth.onAuthStateChanged(user => {
        if (user) {
            const loginBtnEl = document.getElementById("loginBtn");
            db.collection("users").doc(user.uid).onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    loginBtnEl.innerText = `👤 ${data.name}`;
                    loginBtnEl.onclick = () => { auth.signOut().then(() => location.reload()); };

                    let isSuspended = data.suspendedUntil && data.suspendedUntil.toDate() > new Date();
                    if (data.isBanned || isSuspended) {
                        document.getElementById("bannedOverlay").style.display = "flex";
                        document.getElementById("bannedReasonText").innerText = data.banReason || "Account Suspended.";
                    } else {
                        document.getElementById("bannedOverlay").style.display = "none";
                    }

                    if (data.personalNotice) {
                        showNoticeModal("Admin Notice", data.personalNotice);
                        db.collection("users").doc(user.uid).update({ personalNotice: firebase.firestore.FieldValue.delete() });
                    }
                }
            });
        }
    });

    db.collection("settings").doc("globalNotice").onSnapshot(doc => {
        if (doc.exists && doc.data().title && !sessionStorage.getItem("noticeSeen_" + doc.data().timestamp?.seconds)) {
            showNoticeModal(doc.data().title, doc.data().text);
            sessionStorage.setItem("noticeSeen_" + doc.data().timestamp?.seconds, "true");
        }
    });
});

function showNoticeModal(title, text) {
    document.getElementById("cyberMsgTitle").innerText = title;
    document.getElementById("cyberMsgText").innerText = text;
    document.getElementById("cyberMsgModal").classList.remove("hidden");
    const closeBtn = document.getElementById("cyberMsgCloseBtn");
    if(closeBtn) {
        closeBtn.onclick = () => document.getElementById("cyberMsgModal").classList.add("hidden");
    }
}

async function checkUserProfile(user) {
    const doc = await db.collection("users").doc(user.uid).get();
    if (!doc.exists || !doc.data().name) {
        document.getElementById("loginStep").classList.add("hidden");
        document.getElementById("profileStep").classList.remove("hidden");
    } else {
        location.reload();
    }
}

async function loadDynamicProducts() {
    const container = document.getElementById("productsContainer");
    
    db.collection("products").onSnapshot(snapshot => {
        if (snapshot.empty) {
            seedDefaultProducts(); 
        } else {
            let html = "";
            snapshot.forEach(doc => {
                const p = doc.data();
                
                let priceHtml = "";
                if (p.variants && p.variants.trim() !== "") {
                    let opts = p.variants.split(",").map(v => {
                        let parts = v.split(":");
                        return `<option value="${parts[1]?.trim()}" data-details="${parts[0]?.trim()}">${parts[0]?.trim()} - Rs. ${parts[1]?.trim()}</option>`;
                    }).join("");
                    priceHtml = `<select class="cyber-input variant-select" style="margin-bottom: 10px; border-color: var(--neon-purple); font-weight: bold;">${opts}</select>`;
                } else {
                    priceHtml = `<p class="price" data-price="${p.price}">Rs. ${p.price}</p>`;
                }

                let limitedBadge = p.isLimited ? `<div style="position:absolute; top:-12px; right:-10px; background:#ff0055; color:#fff; font-size:10px; font-weight:bold; padding:5px 10px; border-radius:12px; box-shadow:0 0 15px #ff0055; z-index: 10;">🔥 LIMITED TIME</div>` : '';

                html += `
                <div class="card cyber-box" data-name="${p.name}" data-base-price="${p.price}" data-require-email="${p.requireEmail}" style="position: relative;">
                    ${limitedBadge}
                    <i class="${p.iconClass} brand-icon" style="color: ${p.iconColor};"></i>
                    <h3>${p.name}</h3>
                    ${priceHtml}
                    <p class="desc">${p.desc}</p>
                    ${p.requireEmail ? `<input type="email" placeholder="Activation Email (Required)" class="cyber-input user-email-input">` : ''}
                    <button class="cyber-btn full-width buy-trigger">Buy Now</button>
                </div>`;
            });
            container.innerHTML = html;

            document.querySelectorAll(".buy-trigger").forEach(button => {
                button.addEventListener("click", (e) => {
                    if (!auth.currentUser) {
                        alert("🔒 Sign In Required: Please log in before adding items to your cart!");
                        document.getElementById("authModal").classList.remove("hidden");
                        return;
                    }
                    const card = e.target.closest(".card");
                    const name = card.getAttribute("data-name");
                    
                    let price = 0;
                    let details = "";
                    
                    const variantSelect = card.querySelector(".variant-select");
                    if (variantSelect) {
                        price = parseFloat(variantSelect.value);
                        details = variantSelect.options[variantSelect.selectedIndex].getAttribute("data-details");
                    } else {
                        price = parseFloat(card.getAttribute("data-base-price"));
                    }

                    const emailInput = card.querySelector(".user-email-input");
                    const email = emailInput ? emailInput.value.trim() : "";
                    
                    if (card.getAttribute("data-require-email") === "true" && !email) {
                        alert("Please enter a valid activation email address."); return;
                    }
                    
                    cart.push({ name, price, details, email });
                    updateCartUI();
                    document.getElementById("cartModal").classList.remove("hidden");
                });
            });
        }
    }, error => {
        container.innerHTML = `<p style="text-align: center; width: 100%; color: #ff0055;">Database connection error.</p>`;
    });
}

function seedDefaultProducts() {
    const defaults = [
        { name: "Netflix Premium", price: 100, requireEmail: false, iconClass: "fa-solid fa-n", iconColor: "#E50914", desc: "Provided on company's email. 100% warranty.", isLimited: false, variants: "" },
        { name: "Amazon Prime", price: 49, requireEmail: false, iconClass: "fab fa-amazon", iconColor: "#00A8E1", desc: "Provided in company's email. 100% warranty.", isLimited: false, variants: "1 Month:49, 6 Months:69" },
        { name: "Crunchyroll", price: 29, requireEmail: false, iconClass: "fas fa-tv", iconColor: "#F47521", desc: "24/7 support available, 30 days warranty provided in company's email.", isLimited: false, variants: "" },
        { name: "SonyLIV", price: 39, requireEmail: false, iconClass: "fas fa-play-circle", iconColor: "#00A8E1", desc: "30 days warranty provided in company's email. 24/7 customer support available.", isLimited: false, variants: "" },
        { name: "Spotify", price: 59, requireEmail: false, iconClass: "fab fa-spotify", iconColor: "#1DB954", desc: "Premium music experience. Provided in company's email.", isLimited: false, variants: "1 Month:59, 2 Months:69" }
    ];
    defaults.forEach(p => db.collection("products").doc(p.name).set(p));
}

function calculateTotal() {
    let subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    return Math.max(0, Math.round(subtotal - (subtotal * (activeDiscount / 100))));
}

function updateCartUI() {
    document.getElementById("cartBadge").innerText = cart.length;
    document.getElementById("cartItemsContainer").innerHTML = cart.length === 0 ? `<p style="color: #888;">Your cart is empty.</p>` : cart.map((item, index) => `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 5px;">
            <div><b>${item.name}</b> ${item.details ? `(${item.details})` : ''}<br><span style="font-size: 11px; color: #aaa;">Rs. ${item.price}</span></div>
            <button onclick="removeFromCart(${index})" style="background:none; border:none; color:var(--danger-color); cursor:pointer;"><i class="fas fa-trash"></i></button>
        </div>`).join('');
    document.getElementById("cartSubtotal").innerText = `Rs. ${cart.reduce((s, i) => s + i.price, 0)}`;
    document.getElementById("cartTotalPrice").innerText = calculateTotal();
}
window.removeFromCart = function(index) { cart.splice(index, 1); updateCartUI(); };
