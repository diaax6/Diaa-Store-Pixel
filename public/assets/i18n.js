// ===== i18n — Arabic / English =====
const translations = {
    en: {
        brand: 'Diaa Store Pixel Verify',
        admin_panel: 'Admin',
        api_docs: 'API Docs',
        language: '🌐 العربية',

        // Hero
        hero_badge: 'Automated Cloud Pipeline',
        hero_title: 'Gemini Subscription\nAutomation Platform',
        hero_subtitle: 'Activate Gemini Advanced subscriptions instantly. Enter your CDK code below to access your dashboard, submit orders, and track results in real-time.',
        cdk_label: 'Enter your CDK activation code',
        cdk_placeholder: 'CDK-XXXX',
        activate_btn: 'Activate →',

        // Features
        features_title: 'Why Choose Us?',
        features_desc: 'Enterprise-grade automation built for speed, reliability, and scale.',
        feat1_title: 'Instant Automation',
        feat1_desc: 'Submit accounts and get results automatically. No manual work needed — our cloud pipeline handles everything.',
        feat2_title: 'API & Bot Integration',
        feat2_desc: 'Full REST API with webhook notifications. Connect your Telegram bot or any system in minutes.',
        feat3_title: 'Auto Refund System',
        feat3_desc: 'If an order fails, your points are automatically refunded. Zero risk, full transparency.',
        feat4_title: 'Real-time Tracking',
        feat4_desc: 'Monitor every order in real-time. Get instant webhook notifications when status changes.',

        // How it works
        how_title: 'How It Works',
        step1_title: 'Get Your CDK',
        step1_desc: 'Purchase a CDK code with the number of points you need.',
        step2_title: 'Submit Accounts',
        step2_desc: 'Enter account details on the dashboard or via API.',
        step3_title: 'Get Results',
        step3_desc: 'Receive activation confirmation or extract links automatically.',

        // Pricing
        pricing_title: 'Simple Pricing',
        pricing_desc: 'No hidden fees. Pay only for what you use.',
        full_type: 'Full Activation',
        extract_type: 'Extract Link',
        purchase_type: 'Buy Failed Link',
        points_per_order: 'points per order',
        full_desc: 'Complete activation with Visa binding and Gemini subscription. The full package.',
        extract_desc: 'Extract the activation link only. Use it manually whenever you\'re ready.',
        purchase_desc: 'Recover activation links from failed orders at a reduced cost.',

        // Dashboard
        active_cdk: 'Active CDK:',
        change_cdk: 'Change CDK',
        remaining_points: 'Remaining Points',
        total_orders: 'Total Orders',
        pending_running: 'Pending / Running',
        success_count: 'Success',
        failed_count: 'Failed',

        // Tabs
        tab_dashboard: 'Dashboard',
        tab_submit: 'Submit',
        tab_orders: 'Orders',
        tab_api: 'API',
        tab_settings: 'Settings',

        // Submit
        submit_title: 'Submit New Order',
        email: 'Email Address',
        password: 'Password',
        twofa: '2FA Secret Key (Optional)',
        task_type: 'Service Type',
        full_label: '⚡ Full Activation (Visa + Subscribe) — 2 Points',
        extract_label: '🔗 Extract Link Only — 1 Point',
        submit_btn: 'Submit Order →',
        batch_import: 'Batch Import',
        batch_hint: 'One account per line. Use any separator: | , ; ---- or tab',

        // Orders
        orders_title: 'My Orders',
        all: 'All',
        pending: 'Pending',
        running: 'Running',
        success: 'Success',
        failed: 'Failed',
        cancelled: 'Cancelled',
        order_id: 'ID',
        order_email: 'Email',
        order_status: 'Status',
        order_type: 'Type',
        order_details: 'Details',
        order_time: 'Time',
        order_action: 'Action',
        cancel_btn: 'Cancel',
        buy_link: 'Buy Link',
        no_orders: 'No orders yet. Submit your first order to get started!',
        copy_link: 'Copy Link',
        recent_orders: 'Recent Orders',
        refresh: 'Refresh',

        // API
        api_title: 'API Integration',
        api_description: 'Use this CDK code as your API key to integrate with Telegram bots or any system.',
        api_base_url: 'Base URL',
        api_your_key: 'Your API Key',
        api_view_docs: 'View Full Documentation →',

        // Settings
        settings_title: 'Account Settings',
        webhook_title: 'Webhook Notifications',
        webhook_url: 'Webhook URL',
        webhook_hint: 'Receive a POST request whenever an order status changes. Perfect for Telegram bot integration.',
        webhook_events: 'Events: order.updated (pending → running → success/failed)',
        save_btn: 'Save Settings',
        cdk_info_title: 'CDK Information',
        cdk_code_label: 'CDK Code',
        cdk_remaining_label: 'Remaining Points',
        cdk_total_label: 'Total Points',
        logout_btn: 'Logout / Change CDK',

        // Messages
        msg_submitted: 'Order submitted successfully! Check the Orders tab for status.',
        msg_cancelled: 'Order cancelled and points refunded.',
        msg_link_bought: 'Link purchased! Copied to clipboard.',
        msg_webhook_saved: 'Webhook settings saved.',
        msg_insufficient: 'Insufficient balance. Please top up your CDK.',
        msg_invalid_cdk: 'Invalid or inactive CDK code. Please check and try again.',
        msg_error: 'Something went wrong. Please try again.',

        footer_text: '© 2026 Diaa Store Pixel Verify. All rights reserved.',
    },
    ar: {
        brand: 'Diaa Store Pixel Verify',
        admin_panel: 'الإدارة',
        api_docs: 'توثيق API',
        language: '🌐 English',

        hero_badge: 'خط أنابيب سحابي آلي',
        hero_title: 'منصة اشتراكات\nGemini الآلية',
        hero_subtitle: 'فعّل اشتراكات Gemini Advanced فوراً. أدخل كود CDK الخاص بك للوصول إلى لوحة التحكم وإرسال الطلبات ومتابعة النتائج.',
        cdk_label: 'أدخل كود CDK للتفعيل',
        cdk_placeholder: 'CDK-XXXX',
        activate_btn: '← تفعيل',

        features_title: 'لماذا نحن؟',
        features_desc: 'أتمتة احترافية مصممة للسرعة والموثوقية والتوسع.',
        feat1_title: 'أتمتة فورية',
        feat1_desc: 'أرسل الحسابات واحصل على النتائج تلقائياً. لا تحتاج عمل يدوي — خط الأنابيب السحابي يتولى كل شيء.',
        feat2_title: 'تكامل API وبوتات',
        feat2_desc: 'REST API كامل مع إشعارات Webhook. اربط بوت تليجرام أو أي نظام في دقائق.',
        feat3_title: 'نظام استرداد تلقائي',
        feat3_desc: 'إذا فشل طلب، يتم إرجاع نقاطك تلقائياً. بدون مخاطرة، شفافية كاملة.',
        feat4_title: 'تتبع لحظي',
        feat4_desc: 'تابع كل طلب لحظياً. احصل على إشعارات فورية عند تغيير الحالة.',

        how_title: 'كيف يعمل؟',
        step1_title: 'احصل على CDK',
        step1_desc: 'اشترِ كود CDK بعدد النقاط المطلوبة.',
        step2_title: 'أرسل الحسابات',
        step2_desc: 'أدخل بيانات الحسابات في لوحة التحكم أو عبر API.',
        step3_title: 'احصل على النتائج',
        step3_desc: 'استقبل تأكيد التفعيل أو روابط الاستخراج تلقائياً.',

        pricing_title: 'تسعير بسيط',
        pricing_desc: 'بدون رسوم مخفية. ادفع فقط مقابل ما تستخدمه.',
        full_type: 'تفعيل كامل',
        extract_type: 'استخراج رابط',
        purchase_type: 'شراء رابط فاشل',
        points_per_order: 'نقطة لكل طلب',
        full_desc: 'تفعيل كامل مع ربط الفيزا واشتراك Gemini. الباقة الكاملة.',
        extract_desc: 'استخراج رابط التفعيل فقط. استخدمه يدوياً وقتما تشاء.',
        purchase_desc: 'استرجاع روابط التفعيل من الطلبات الفاشلة بتكلفة مخفضة.',

        active_cdk: 'CDK النشط:',
        change_cdk: 'تغيير CDK',
        remaining_points: 'النقاط المتبقية',
        total_orders: 'إجمالي الطلبات',
        pending_running: 'قيد الانتظار / التشغيل',
        success_count: 'ناجح',
        failed_count: 'فاشل',

        tab_dashboard: 'لوحة التحكم',
        tab_submit: 'إرسال',
        tab_orders: 'الطلبات',
        tab_api: 'API',
        tab_settings: 'الإعدادات',

        submit_title: 'إرسال طلب جديد',
        email: 'البريد الإلكتروني',
        password: 'كلمة المرور',
        twofa: 'مفتاح 2FA (اختياري)',
        task_type: 'نوع الخدمة',
        full_label: '⚡ تفعيل كامل (فيزا + اشتراك) — ٢ نقطة',
        extract_label: '🔗 استخراج رابط فقط — ١ نقطة',
        submit_btn: '← إرسال الطلب',
        batch_import: 'استيراد مجمّع',
        batch_hint: 'حساب واحد في كل سطر. استخدم أي فاصل: | , ; ---- أو tab',

        orders_title: 'طلباتي',
        all: 'الكل',
        pending: 'انتظار',
        running: 'جاري',
        success: 'ناجح',
        failed: 'فاشل',
        cancelled: 'ملغي',
        order_id: 'رقم',
        order_email: 'البريد',
        order_status: 'الحالة',
        order_type: 'النوع',
        order_details: 'التفاصيل',
        order_time: 'الوقت',
        order_action: 'إجراء',
        cancel_btn: 'إلغاء',
        buy_link: 'شراء الرابط',
        no_orders: 'لا توجد طلبات بعد. أرسل أول طلب للبدء!',
        copy_link: 'نسخ الرابط',
        recent_orders: 'آخر الطلبات',
        refresh: 'تحديث',

        api_title: 'تكامل API',
        api_description: 'استخدم كود CDK كمفتاح API للتكامل مع بوتات تليجرام أو أي نظام.',
        api_base_url: 'الرابط الأساسي',
        api_your_key: 'مفتاح API الخاص بك',
        api_view_docs: '← عرض التوثيق الكامل',

        settings_title: 'إعدادات الحساب',
        webhook_title: 'إشعارات Webhook',
        webhook_url: 'رابط Webhook',
        webhook_hint: 'استقبل طلب POST عند تغيير حالة أي طلب. مثالي لتكامل بوت تليجرام.',
        webhook_events: 'الأحداث: order.updated (انتظار ← جاري ← ناجح/فاشل)',
        save_btn: 'حفظ الإعدادات',
        cdk_info_title: 'معلومات CDK',
        cdk_code_label: 'كود CDK',
        cdk_remaining_label: 'النقاط المتبقية',
        cdk_total_label: 'إجمالي النقاط',
        logout_btn: 'تسجيل خروج / تغيير CDK',

        msg_submitted: 'تم إرسال الطلب بنجاح! تابع حالته في تبويب الطلبات.',
        msg_cancelled: 'تم إلغاء الطلب وإرجاع النقاط.',
        msg_link_bought: 'تم شراء الرابط! تم نسخه إلى الحافظة.',
        msg_webhook_saved: 'تم حفظ إعدادات Webhook.',
        msg_insufficient: 'رصيد غير كافٍ. يرجى شحن كود CDK.',
        msg_invalid_cdk: 'كود CDK غير صالح أو غير نشط. يرجى التحقق والمحاولة مرة أخرى.',
        msg_error: 'حدث خطأ. يرجى المحاولة مرة أخرى.',

        footer_text: '© 2026 Diaa Store Pixel Verify. جميع الحقوق محفوظة.',
    }
};

let currentLang = localStorage.getItem('lang') || 'en';

function t(key) {
    return translations[currentLang]?.[key] || translations['en'][key] || key;
}

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // Update data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (text) {
            if (el.tagName === 'INPUT') el.placeholder = text;
            else el.textContent = text;
        }
    });
    if (typeof renderUI === 'function') renderUI();
}

function toggleLang() {
    setLang(currentLang === 'en' ? 'ar' : 'en');
}
