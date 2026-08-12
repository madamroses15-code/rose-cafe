(function () {
  'use strict';

  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbx_PqubX4z-wcJ-OcNfARcDkCCLxvDdxrFbairEpoaYJRJL1KQfYhcg5pkGwMsKqHVCvw/exec';
  const DEMO = new URLSearchParams(location.search).has('demo');
  const DEMO_MENU = [
    {name:'น้ำพริกปลาทูฟู',description:'รสกลมกล่อม หอมเครื่องสมุนไพร ทานกับผักสดหรือข้าวร้อน ๆ',price:55,extraPrice:null,category:'Food',imageUrl:'assets/nam-prik-pla-too-fu.webp',status:'Available',trackSales:true},
    {name:'โรส อัญชัญเลมอน',description:'น้ำอัญชัญมะนาวเพื่อสุขภาพ สดชื่น หอมมะนาว',price:25,extraPrice:null,category:'Non-Coffee',imageUrl:'',status:'Available',trackSales:true},
    {name:'ชาไทยโรสซี่ (Rosy Thai Milk Tea)',description:'ชาไทยหอมเข้ม หวานมันกำลังดี',price:45,extraPrice:10,category:'Tea',imageUrl:'',status:'Available',trackSales:true},
    {name:'มัทฉะ คลาวด์ ลาเต้ (Matcha Cloud Latte)',description:'มัทฉะหอมละมุนกับนมสด',price:55,extraPrice:10,category:'Non-Coffee',imageUrl:'',status:'Available',trackSales:true}
  ];

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const requestId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const JSONP_TIMEOUT_MS = 45000;
  const POST_RESULT_TIMEOUT_MS = 90000;

  function jsonp(action, params = {}, timeoutMs = JSONP_TIMEOUT_MS) {
    if (DEMO) return demoGet(action, params);
    return new Promise((resolve, reject) => {
      const callback = `roseApi_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement('script');
      const query = new URLSearchParams({action, callback, ...params, _:Date.now()});
      const timer = setTimeout(() => finish(new Error('เซิร์ฟเวอร์ตอบสนองช้า กรุณารอสักครู่')), timeoutMs);
      function finish(error, data) {
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        error ? reject(error) : resolve(data);
      }
      window[callback] = data => finish(null, data);
      script.onerror = () => finish(new Error('เชื่อมต่อ Apps Script API ไม่สำเร็จ'));
      script.src = `${ENDPOINT}?${query.toString()}`;
      document.head.appendChild(script);
    });
  }

  async function post(action, payload = {}) {
    if (DEMO) return demoPost(action, payload);
    const id = requestId();
    const body = new URLSearchParams({action, requestId:id, payload:JSON.stringify(payload)});
    const controller = new AbortController();
    const submitTimer = setTimeout(() => controller.abort(), 45000);
    try {
      await fetch(ENDPOINT, {method:'POST', mode:'no-cors', headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'}, body, signal:controller.signal});
    } catch (error) {
      // Apps Script อาจรับคำขอแล้วแม้เบราว์เซอร์หมดเวลารอ จึงตรวจผลจาก requestId ต่อเพื่อป้องกันออเดอร์ซ้ำ
    } finally {
      clearTimeout(submitTimer);
    }
    const deadline = Date.now() + POST_RESULT_TIMEOUT_MS;
    let lastConnectionError = null;
    for (let attempt = 0; Date.now() < deadline; attempt += 1) {
      await sleep(attempt < 2 ? 550 : 900);
      try {
        const remaining = Math.max(5000, Math.min(JSONP_TIMEOUT_MS, deadline - Date.now()));
        const result = await jsonp('result', {requestId:id}, remaining);
        if (result && !result.pending) {
          if (result.success === false) throw new Error(result.message || 'ดำเนินการไม่สำเร็จ');
          return result;
        }
      } catch (error) {
        if (!/ตอบสนองช้า|เชื่อมต่อ/.test(error.message)) throw error;
        lastConnectionError = error;
      }
    }
    throw new Error(lastConnectionError ? 'การเชื่อมต่อไม่เสถียร กรุณาลองอีกครั้ง' : 'ยังไม่ได้รับคำตอบจากระบบ กรุณาตรวจสอบรายการอีกครั้ง');
  }

  async function demoGet(action) {
    await sleep(180);
    if (action === 'menu') return {success:true,items:DEMO_MENU};
    if (action === 'discounts') return {success:true,discounts:[{name:'สมาชิก ROSE 10%',value:.1}]};
    if (action === 'health') return {success:true,message:'Demo API ready'};
    return {success:true};
  }

  async function demoPost(action, payload) {
    await sleep(240);
    if (action === 'order') return {success:true,orderNumber:`ORD-DEMO-${Date.now()}`,tableNumber:'Delivery (จัดส่ง)'};
    if (action === 'adminLogin') return payload.password === '1234' ? {success:true,token:'demo-admin-token'} : Promise.reject(new Error('รหัสผ่านไม่ถูกต้อง'));
    if (action === 'adminHistory') {
      return {success:true,orders:{
        'ORD-DEMO-001':{orderNumber:'ORD-DEMO-001',status:'Waiting',timestampForDisplay:'09:45',isoTimestamp:new Date().toISOString(),customerName:'คุณโรส',customerPhone:'0812345678',deliveryAddress:'15 ถนนกุหลาบ แขวงบางรัก กรุงเทพมหานคร 10500',deliveryLocation:'https://www.google.com/maps?q=13.724560,100.493030',items:[{name:'น้ำพริกปลาทูฟู',quantity:2}],total:110},
        'ORD-DEMO-002':{orderNumber:'ORD-DEMO-002',status:'Paid',timestampForDisplay:'09:20',isoTimestamp:new Date(Date.now()-1000000).toISOString(),items:[{name:'โรส อัญชัญเลมอน',quantity:1}],total:25}
      }};
    }
    if (action === 'adminMenu') return {success:true,items:DEMO_MENU};
    if (action === 'adminDashboard') return {success:true,data:{dailySales:135,monthlySales:4260,topSellingItems:[{name:'น้ำพริกปลาทูฟู',quantity:18},{name:'โรส อัญชัญเลมอน',quantity:12}],salesByDay:{}}};
    return {success:true};
  }

  window.RoseApi = {endpoint:ENDPOINT, demo:DEMO, get:jsonp, post};
}());
