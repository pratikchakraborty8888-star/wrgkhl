const firebaseConfig = {
  apiKey: "AIzaSyDUowN2gw6HvlBooZw2VDbroabjGhjMlRM",
  authDomain: "cyber-store-b2668.firebaseapp.com",
  projectId: "cyber-store-b2668",
  storageBucket: "cyber-store-b2668.firebasestorage.app",
  messagingSenderId: "1014814260411",
  appId: "1:1014814260411:web:c7adff1a39026e8fd53d9e",
  measurementId: "G-4HP0L2KV1Q"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- Custom In-Website Modal Replacing Browser Alerts ---
function showCyberMessage(title, text) {
    const modal = document.getElementById('cyberMsgModal');
    const titleEl = document.getElementById('cyberMsgTitle');
    const textEl = document.getElementById('cyberMsgText');
    const closeBtn = document.getElementById('cyberMsgCloseBtn');

    if (modal && titleEl && textEl) {
        titleEl.innerText = title;
        textEl.innerText = text;
        modal.classList.remove('hidden');

        if (closeBtn) {
            closeBtn.onclick = () => modal.classList.add('hidden');
        }
    } else {
        alert(text);
    }
}

// --- EmailJS Automated Email Functions ---
function sendWelcomeEmail(userEmail, userName) {
    if (typeof emailjs !== 'undefined') {
        emailjs.send("default_service", "template_fs19kmp", {
            to_email: userEmail,
            email: userEmail,
            to_name: userName,
            name: userName
        }).catch(err => console.error("Welcome Email Error:", err));
    }
}

function sendInvoiceEmail(userEmail, orderId, productSummary, subtotalPrice, discountText, totalPrice, freeGift, utrNumber, userName) {
    if (typeof emailjs !== 'undefined') {
        emailjs.send("default_service", "template_3cmbs5d", {
            to_email: userEmail,
            email: userEmail,
            to_name: userName,
            name: userName,
            // Order ID aliases
            order_id: orderId,
            orderId: orderId,
            // Warranty form link
            warranty_link: "https://forms.gle/cjD9pAXpdBXLCGiz8",
            warranty_url: "https://forms.gle/cjD9pAXpdBXLCGiz8",
            // Product & financial details
            product_summary: productSummary,
            products: productSummary,
            subtotal_price: subtotalPrice,
            subtotal: subtotalPrice,
            discount_text: discountText,
            discount: discountText,
            total_price: totalPrice,
            total: totalPrice,
            free_gift: freeGift,
            gift: freeGift,
            utr_number: utrNumber,
            utr: utrNumber
        }).catch(err => console.error("Invoice Email Error:", err));
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadDynamicStorefront();

    async function loadDynamicStorefront() {
        try {
            const eventsContainer = document.getElementById('eventsBannerContainer');
            if (eventsContainer) {
                const eventSnap = await db.collection("events").orderBy("createdAt", "desc").get();
                eventsContainer.innerHTML = "";
                if (!eventSnap.empty) {
                    eventSnap.forEach(doc => {
                        const ev = doc.data();
                        eventsContainer.innerHTML += `
                            <div class="cyber-box" style="margin-bottom: 20px; border-color: var(--neon-purple); box-shadow: 0 0 25px rgba(176,38,255,0.35);">
                                ${ev.poster ? `<img src="${ev.poster}" alt="Banner" style="width:100%; border-radius:8px; margin-bottom:12px;">` : ''}
                                <h3 style="color:#fff; font-size:24px; margin-bottom:8px;">⚡ ${ev.title}</h3>
                                <p class="desc" style="margin-bottom:0; font-size:15px; color:#d1c4e9;">${ev.desc}</p>
                            </div>`;
                    });
                }
            }

            const productsContainer = document.getElementById('productsContainer');
            if (productsContainer) {
                const prodSnap = await db.collection("products").get();
                if (!prodSnap.empty) {
                    prodSnap.forEach(doc => {
                        const p = doc.data();
                        productsContainer.innerHTML += `
                            <div class="card cyber-box" data-name="${p.name}" data-price="${p.price}" data-require-email="true">
                                ${p.logo ? `<img src="${p.logo}" alt="Logo" style="height:40px; margin-bottom:15px; object-fit:contain;">` : '<i class="fas fa-cube brand-icon" style="color: var(--neon-purple);"></i>'}
                                <h3>${p.name}</h3>
                                <p class="price">Rs. ${p.price}</p>
                                <p class="desc">${p.desc || 'Provided in customer email with 24/7 support.'}</p>
                                <input type="email" placeholder="Activation Email (Required)" class="cyber-input user-email-input">
                                <button class="cyber-btn full-width buy-trigger">Buy Now</button>
                            </div>`;
                    });
                    bindBuyTriggers();
                }
            }
        } catch (e) {
            console.error("Storefront load error:", e);
        }
    }

    // Instagram Pricing Logic
    const instaCountInput = document.getElementById('instaCount');
    const instaPriceText = document.getElementById('instaPrice');

    if (instaCountInput && instaPriceText) {
        instaCountInput.addEventListener('input', (e) => {
            let count = parseInt(e.target.value) || 0;
            if (count > 75000) count = 75000;
            if (count < 100 && count > 0) count = 100;
            
            let basePrice = count * 0.06;
            if (count > 1000) {
                basePrice = basePrice * 0.90;
            }
            let finalPrice = Math.round(basePrice);
            instaPriceText.innerText = finalPrice;
        });
    }

    const cartModal = document.getElementById('cartModal');
    const closeCartModal = document.getElementById('closeCartModal');
    const paymentModal = document.getElementById('paymentModal');
    const closePaymentModal = document.getElementById('closePaymentModal');
    const openCartBtn = document.getElementById('openCartBtn');
    const cartBadge = document.getElementById('cartBadge');
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartTotalPrice = document.getElementById('cartTotalPrice');
    const proceedToCheckoutBtn = document.getElementById('proceedToCheckoutBtn');
    const dynamicQrImg = document.getElementById('dynamicQrImg');
    const promoCodeInput = document.getElementById('promoCodeInput');
    const applyPromoBtn = document.getElementById('applyPromoBtn');
    const promoFeedback = document.getElementById('promoFeedback');
    const customerPhone = document.getElementById('customerPhone');
    const utrInput = document.getElementById('utrInput');
    const submitOrderBtn = document.getElementById('submitOrderBtn');

    let currentCart = JSON.parse(localStorage.getItem('cyber_store_cart')) || [];
    let appliedDiscountPercent = 0;
    let appliedFreeGift = "";

    function saveCart() {
        localStorage.setItem('cyber_store_cart', JSON.stringify(currentCart));
        updateCartBadge();
    }

    function updateCartBadge() {
        if (cartBadge) {
            cartBadge.innerText = currentCart.reduce((sum, i) => sum + i.qty, 0);
        }
    }
    updateCartBadge();

    window.removeFromCart = function(index) {
        currentCart.splice(index, 1);
        saveCart();
        updateCartDisplay();
    };

    function bindBuyTriggers() {
        document.querySelectorAll('.buy-trigger').forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });
        document.querySelectorAll('.buy-trigger').forEach(button => {
            button.addEventListener('click', (e) => {
                const currentUser = auth.currentUser;
                if (!currentUser) {
                    showCyberMessage("Authentication Required", "Please sign in first to order products!");
                    document.getElementById('loginBtn').click();
                    return;
                }

                const card = e.target.closest('.card');
                const name = card.getAttribute('data-name');
                let price = parseFloat(card.getAttribute('data-price'));
                const requireEmail = card.getAttribute('data-require-email') === 'true';
                
                let userEmail = "";
                if (requireEmail) {
                    const emailInput = card.querySelector('.user-email-input');
                    userEmail = emailInput ? emailInput.value.trim() : "";
                    if (!userEmail) {
                        showCyberMessage("Activation Email Required", "Please enter your activation email address first!");
                        if (emailInput) emailInput.focus();
                        return;
                    }
                }

                if (name === "Spotify Premium") {
                    const planSelect = document.getElementById('spotifyPlan');
                    if (planSelect) price = parseFloat(planSelect.value);
                }

                const existingIndex = currentCart.findIndex(item => item.product === name && item.details === userEmail);
                if (existingIndex > -1) {
                    currentCart[existingIndex].qty += 1;
                } else {
                    currentCart.push({
                        product: name,
                        price: price,
                        details: userEmail || 'Company Provided',
                        qty: 1
                    });
                }

                saveCart();
                showCyberMessage("Cart Updated", `${name} added to cart!`);
            });
        });
    }
    bindBuyTriggers();

    const instaBuyTrigger = document.getElementById('instaBuyTrigger');
    if (instaBuyTrigger) {
        instaBuyTrigger.addEventListener('click', () => {
            const currentUser = auth.currentUser;
            if (!currentUser) { showCyberMessage("Authentication Required", "Please sign in first!"); document.getElementById('loginBtn').click(); return; }

            const count = parseInt(instaCountInput.value) || 100;
            if (count < 100 || count > 75000) {
                showCyberMessage("Invalid Limit", "Minimum order is 100 and maximum is 75,000 followers!");
                return;
            }
            const price = parseFloat(instaPriceText.innerText);
            const usernameInput = document.getElementById('instaUsername');
            const username = usernameInput ? usernameInput.value.trim() : "";

            if (!username) { showCyberMessage("Username Required", "Please enter your Instagram username!"); return; }

            currentCart.push({
                product: `Instagram (${count} Followers)`,
                price: price,
                details: username,
                qty: 1
            });

            saveCart();
            showCyberMessage("Cart Updated", "Instagram boost added to cart!");
        });
    }

    if (openCartBtn) {
        openCartBtn.onclick = () => {
            if (currentCart.length === 0) { showCyberMessage("Cart Empty", "Your cart is empty!"); return; }
            updateCartDisplay();
            cartModal.classList.remove('hidden');
        };
    }

    function updateCartDisplay() {
        updateCartBadge();
        cartItemsContainer.innerHTML = "";
        let subtotal = 0;

        currentCart.forEach((item, index) => {
            subtotal += item.price * item.qty;
            cartItemsContainer.innerHTML += `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px dashed #333; padding-bottom:8px;">
                    <span><b>${item.qty}x ${item.product}</b><br><small style="color:#b39ddb">Activation: ${item.details}</small></span>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span>Rs. ${item.price * item.qty}</span>
                        <button onclick="removeFromCart(${index})" style="background:none; border:none; color:#ff0055; cursor:pointer;" title="Remove"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
        });

        cartSubtotal.innerText = `Rs. ${subtotal}`;
        let finalPrice = subtotal - (subtotal * (appliedDiscountPercent / 100));
        if (finalPrice < 0) finalPrice = 0;
        cartTotalPrice.innerText = finalPrice;
    }

    if (applyPromoBtn) {
        applyPromoBtn.onclick = async () => {
            const code = promoCodeInput.value.trim().toUpperCase();
            if (!code) return;

            try {
                const snap = await db.collection("promos").where("code", "==", code).get();
                if (snap.empty) {
                    promoFeedback.style.color = "#ff0055";
                    promoFeedback.innerText = "Invalid promo code!";
                    appliedDiscountPercent = 0; appliedFreeGift = "";
                } else {
                    snap.forEach(doc => {
                        const promo = doc.data();

                        if (promo.isSpecific) {
                            const userSixId = loggedInUserData ? loggedInUserData.sixDigitId : null;
                            if (!userSixId || !promo.specificUsers.includes(userSixId)) {
                                promoFeedback.style.color = "#ff0055";
                                promoFeedback.innerText = "This promo code is not valid for your account ID!";
                                appliedDiscountPercent = 0;
                                appliedFreeGift = "";
                                updateCartDisplay();
                                return;
                            }
                        }

                        appliedDiscountPercent = promo.discount || 0;
                        appliedFreeGift = promo.freeGift || "";
                        promoFeedback.style.color = "var(--success-color)";
                        promoFeedback.innerText = `Success! ${promo.discount}% off. ${promo.freeGift ? 'Gift: '+promo.freeGift : ''}`;
                    });
                }
                updateCartDisplay();
            } catch(e) {}
        };
    }

    if (proceedToCheckoutBtn) {
        proceedToCheckoutBtn.onclick = () => {
            if (currentCart.length === 0) return;
            dynamicQrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=upi://pay?pa=cyberpratik@fam&pn=CyberStore&am=${cartTotalPrice.innerText}&cu=INR`;
            cartModal.classList.add('hidden');
            paymentModal.classList.remove('hidden');
        };
    }

    if (closeCartModal) closeCartModal.onclick = () => cartModal.classList.add('hidden');
    if (closePaymentModal) closePaymentModal.onclick = () => paymentModal.classList.add('hidden');

    if (submitOrderBtn) {
        submitOrderBtn.addEventListener('click', async () => {
            const phone = customerPhone.value.trim();
            if (!/^[6-9]\d{9}$/.test(phone)) { 
                showCyberMessage("Invalid Phone", "Enter valid 10-digit Indian mobile number!"); 
                customerPhone.focus(); 
                return; 
            }

            const utr = utrInput.value.trim();
            const utrRegex = /^\d{12}$/;
            if (!utrRegex.test(utr)) {
                showCyberMessage("Invalid UTR", "A valid UPI Transaction ID / UTR must be exactly 12 numeric digits.");
                utrInput.focus();
                return;
            }

            // 🚀 Generate Unique Order ID (#ORDER + random alphanumeric)
            const orderId = '#ORDER' + Math.random().toString(36).substring(2, 8).toUpperCase();

            const currentUser = auth.currentUser;
            const productSummaryForFirestore = currentCart.map(i => `${i.qty}x ${i.product} (${i.details})`).join(', ');
            const productSummaryForEmail = currentCart.map(i => `• ${i.qty} x ${i.product} (Rs. ${i.price * i.qty})`).join('\n');
            
            const subtotalAmount = `Rs. ${cartSubtotal.innerText.replace('Rs. ', '')}`;
            const promoTextUsed = promoCodeInput.value.trim().toUpperCase();
            const discountDetails = appliedDiscountPercent > 0 
                ? `${appliedDiscountPercent}% OFF (Code: ${promoTextUsed})` 
                : "None Applied";

            try {
                // Save order with Order ID to Firestore
                await db.collection("orders").add({
                    orderId: orderId,
                    product: productSummaryForFirestore,
                    price: cartTotalPrice.innerText,
                    customerPhone: phone,
                    freeGift: appliedFreeGift || 'None',
                    userId: currentUser ? currentUser.uid : 'guest',
                    customerEmail: currentUser ? currentUser.email : 'Guest',
                    utrNumber: utr,
                    status: "PAID & PENDING",
                    createdAt: new Date()
                });

                const recipientEmail = currentUser ? currentUser.email : "customer@gmail.com";
                const recipientName = loggedInUserData ? loggedInUserData.fullName : "Valued Customer";
                
                // Send invoice email containing Order ID and Warranty registration form link
                sendInvoiceEmail(
                    recipientEmail, 
                    orderId,
                    productSummaryForEmail, 
                    subtotalAmount, 
                    discountDetails, 
                    `Rs. ${cartTotalPrice.innerText}`, 
                    appliedFreeGift || 'None', 
                    utr, 
                    recipientName
                );

                showCyberMessage("Order Placed Successfully!", `Order placed successfully! Your Order ID is ${orderId}. Details and warranty registration info were sent to your email.`);
                
                paymentModal.classList.add('hidden');
                currentCart = [];
                saveCart();
                utrInput.value = ""; 
                customerPhone.value = ""; 
                promoCodeInput.value = ""; 
                promoFeedback.innerText = "";
            } catch (error) { 
                showCyberMessage("Error", "Error submitting order. Please try again."); 
            }
        });
    }

    // --- Auth & Login System ---
    const loginBtn = document.getElementById('loginBtn');
    const authModal = document.getElementById('authModal');
    const closeModal = document.getElementById('closeModal');
    const userProfileModal = document.getElementById('userProfileModal');
    const closeUserProfile = document.getElementById('closeUserProfile');
    const loginStep = document.getElementById('loginStep');
    const profileStep = document.getElementById('profileStep');
    const emailPassLoginBtn = document.getElementById('emailPassLoginBtn');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    let loggedInUserData = null;

    function showStep(step) {
        if(loginStep) loginStep.classList.add('hidden');
        if(profileStep) profileStep.classList.add('hidden');
        if(step) step.classList.remove('hidden');
    }

    auth.onAuthStateChanged(async (user) => {
        try {
            const bannedOverlay = document.getElementById('bannedOverlay');
            if (bannedOverlay) bannedOverlay.style.display = 'none';

            if (user) {
                let userDocRef = db.collection("users").doc(user.uid);
                let userDoc = await userDocRef.get();
                if (userDoc.exists) {
                    loggedInUserData = userDoc.data();

                    if (!loggedInUserData.sixDigitId) {
                        const generatedSixId = Math.floor(100000 + Math.random() * 900000).toString();
                        await userDocRef.update({ sixDigitId: generatedSixId });
                        loggedInUserData.sixDigitId = generatedSixId;
                    }

                    if (loggedInUserData.banned) {
                        if (bannedOverlay) bannedOverlay.style.display = 'flex';
                        const bannedReasonText = document.getElementById('bannedReasonText');
                        if (bannedReasonText) {
                            bannedReasonText.innerText = `ACCESS RESTRICTED\n\nYour account has been restricted or banned from Cyber Store.\nReason: ${loggedInUserData.banReason || 'Violation of Cyber Store policies.'}`;
                        }
                        await auth.signOut();
                        return;
                    }

                    if (loggedInUserData.suspended) {
                        const now = new Date().getTime();
                        if (loggedInUserData.suspendUntil && now < loggedInUserData.suspendUntil) {
                            if (bannedOverlay) bannedOverlay.style.display = 'flex';
                            const bannedReasonText = document.getElementById('bannedReasonText');
                            if (bannedReasonText) {
                                bannedReasonText.innerText = `❌ ACCOUNT SUSPENDED\n\nUntil: ${new Date(loggedInUserData.suspendUntil).toLocaleString()}\nReason: ${loggedInUserData.suspendReason || 'Temporary suspension.'}`;
                            }
                            await auth.signOut();
                            return;
                        } else {
                            await userDocRef.update({ suspended: false, suspendUntil: null, suspendReason: "" });
                        }
                    }

                    if (loginBtn) loginBtn.innerText = `👤 ${loggedInUserData.fullName}`;
                    fetchUserNotices(user.uid);
                } else {
                    if (loginBtn) loginBtn.innerText = `👤 Account Setup Needed`;
                }
            } else {
                loggedInUserData = null;
                if (loginBtn) loginBtn.innerText = "Login / Sign Up";
            }
        } catch (err) {
            console.error("Auth state change error:", err);
        }
    });

    async function fetchUserNotices(uid) {
        try {
            const snap = await db.collection("notices").where("userId", "==", uid).where("read", "==", false).get();
            snap.forEach(doc => {
                const notice = doc.data();
                if (notice.type === 'WARNING') { showCyberMessage("Admin Warning", notice.message); }
                else if (notice.type === 'BONUS') { showCyberMessage("Bonus Granted", notice.message); }
                db.collection("notices").doc(doc.id).update({ read: true });
            });
        } catch(e) {}
    }

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (user && loggedInUserData) {
                userProfileModal.classList.remove('hidden');
                document.getElementById('dashSixId').innerText = loggedInUserData.sixDigitId || 'N/A';
                document.getElementById('dashName').innerText = loggedInUserData.fullName || 'N/A';
                document.getElementById('dashEmail').innerText = user.email || 'N/A';
                document.getElementById('dashDob').innerText = loggedInUserData.dateOfBirth || 'Not specified';

                const ordersContainer = document.getElementById('userOrdersList');
                ordersContainer.innerHTML = "<p style='color: var(--neon-purple);'>Fetching orders...</p>";
                try {
                    const snap = await db.collection("orders").where("userId", "==", user.uid).get();
                    ordersContainer.innerHTML = snap.empty ? "<p>No orders placed yet.</p>" : "";
                    snap.forEach(doc => {
                        const ord = doc.data();
                        ordersContainer.innerHTML += `
                            <div class="cyber-box" style="padding: 10px; margin-bottom: 10px; font-size: 12px;">
                                <p><b>[${ord.order_id || ord.orderId || 'ORDER'}] ${ord.product}</b> - Rs. ${ord.price}</p>
                                ${ord.freeGift !== 'None' ? `<p style="color:var(--neon-violet);">Gift: ${ord.freeGift}</p>` : ''}
                                <p>UTR: ${ord.utrNumber} | Status: <span style="color:${ord.status==='COMPLETED'?'#00ff66':'#ff0055'}">${ord.status}</span></p>
                            </div>`;
                    });
                } catch (err) {}
            } else {
                authModal.classList.remove('hidden');
                showStep(loginStep);
            }
        });
    }

    if (closeModal) closeModal.addEventListener('click', () => authModal.classList.add('hidden'));
    if (closeUserProfile) closeUserProfile.addEventListener('click', () => userProfileModal.classList.add('hidden'));

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await auth.signOut();
            userProfileModal.classList.add('hidden');
            showCyberMessage("Disconnected", "You have successfully logged out.");
            window.location.reload();
        });
    }

    const googleLoginBtn = document.getElementById('googleLoginBtn');
    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                const res = await auth.signInWithPopup(provider);
                const userDoc = await db.collection("users").doc(res.user.uid).get();
                if (!userDoc.exists) { showStep(profileStep); } else { authModal.classList.add('hidden'); window.location.reload(); }
            } catch (error) { showCyberMessage("Google Login Error", error.message); }
        });
    }

    if (emailPassLoginBtn) {
        emailPassLoginBtn.addEventListener('click', async () => {
            const emailField = document.getElementById('authEmail');
            const passwordField = document.getElementById('authPassword');
            
            if (!emailField || !passwordField) return;

            const email = emailField.value.trim();
            const password = passwordField.value.trim();
            
            if (!email || !password) {
                showCyberMessage("Missing Fields", "Please enter email and password.");
                return;
            }

            try {
                const userCred = await auth.signInWithEmailAndPassword(email, password);
                const userDoc = await db.collection("users").doc(userCred.user.uid).get();
                if (!userDoc.exists) {
                    showStep(profileStep);
                } else {
                    authModal.classList.add('hidden');
                    window.location.reload();
                }
            } catch (loginErr) {
                if (loginErr.code === 'auth/user-not-found') {
                    try {
                        await auth.createUserWithEmailAndPassword(email, password);
                        showStep(profileStep);
                    } catch (signupErr) {
                        showCyberMessage("Signup Error", signupErr.message);
                    }
                } else if (loginErr.code === 'auth/invalid-credential' || loginErr.code === 'auth/wrong-password') {
                    try {
                        await auth.createUserWithEmailAndPassword(email, password);
                        showStep(profileStep);
                    } catch (signupErr) {
                        if (signupErr.code === 'auth/email-already-in-use') {
                            showCyberMessage("Incorrect Password", "Please check your password and try again.");
                        } else {
                            showCyberMessage("Auth Error", signupErr.message);
                        }
                    }
                } else {
                    showCyberMessage("Login Error", loginErr.message);
                }
            }
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const nameField = document.getElementById('profileName');
            const dobField = document.getElementById('profileDob');
            
            if (!nameField) return;

            const name = nameField.value.trim();
            const dob = dobField ? dobField.value : "";
            const user = auth.currentUser;
            
            if (!name) { showCyberMessage("Name Required", "Please enter your full name!"); return; }

            try {
                if (user) {
                    const sixDigitId = Math.floor(100000 + Math.random() * 900000).toString();
                    await db.collection("users").doc(user.uid).set({
                        uid: user.uid, email: user.email, fullName: name, dateOfBirth: dob, sixDigitId: sixDigitId, role: "customer", suspended: false, banned: false, createdAt: new Date()
                    }, { merge: true });

                    sendWelcomeEmail(user.email, name);
                }
                showCyberMessage("Profile Saved", `Welcome, ${name}! Welcome email dispatched.`);
                authModal.classList.add('hidden');
                window.location.reload();
            } catch (error) { showCyberMessage("Error", "Error saving profile."); }
        });
    }
});