(function () {
  'use strict';
  const state = {menu:[],cart:new Map(),discounts:[],discount:null,paymentMethod:'QR PromptPay',order:null,slipData:''};
  const el = id => document.getElementById(id);
  const money = value => `฿${Number(value || 0).toFixed(2)}`;
  const imageFor = item => item.name.includes('น้ำพริกปลาทูฟู') ? 'assets/nam-prik-pla-too-fu.webp' : item.imageUrl;

  document.addEventListener('DOMContentLoaded', init);
  async function init() {
    bindEvents();
    el('promptpay-qr').src = window.ROSE_PROMPTPAY_QR || '';
    try {
      const [menuResult, discountResult] = await Promise.all([RoseApi.get('menu'),RoseApi.get('discounts')]);
      state.menu = menuResult.items || [];
      state.discounts = discountResult.discounts || [];
      renderDiscounts();
      renderMenu();
    } catch (error) {
      el('menu-state').textContent = `${error.message} กรุณารีเฟรชอีกครั้ง`;
    }
  }

  function bindEvents() {
    el('menu-search').addEventListener('input', renderMenu);
    el('category-nav').addEventListener('click', event => {
      const button = event.target.closest('button[data-category]');
      if (!button) return;
      document.getElementById(`category-${slug(button.dataset.category)}`)?.scrollIntoView({behavior:'smooth',block:'start'});
    });
    el('menu-container').addEventListener('click', changeQuantity);
    el('cart-fab').addEventListener('click', () => toggleCart(true));
    el('close-cart').addEventListener('click', () => toggleCart(false));
    el('drawer-backdrop').addEventListener('click', () => toggleCart(false));
    el('cart-items').addEventListener('click', changeQuantity);
    el('discount-select').addEventListener('change', event => {
      state.discount = state.discounts[Number(event.target.value)] || null;
      renderCart();
    });
    el('place-order').addEventListener('click', openCheckout);
    document.querySelectorAll('.payment-tab').forEach(button => button.addEventListener('click', selectPayment));
    el('slip-input').addEventListener('change', handleSlip);
    el('use-current-location').addEventListener('click', useCurrentLocation);
    ['customer-name','customer-phone','delivery-address','delivery-location'].forEach(id => el(id).addEventListener('input', event => {
      event.currentTarget.classList.remove('user-invalid');
      event.currentTarget.setCustomValidity('');
    }));
    el('confirm-payment').addEventListener('click', confirmPayment);
  }

  function slug(value) { return String(value).toLowerCase().replace(/[^a-z0-9ก-๙]+/g,'-'); }
  function renderDiscounts() {
    const select = el('discount-select');
    state.discounts.forEach((discount,index) => select.insertAdjacentHTML('beforeend',`<option value="${index}">${escapeHtml(discount.name)}</option>`));
  }
  function renderMenu() {
    const query = el('menu-search').value.trim().toLowerCase();
    const items = state.menu.filter(item => `${item.name} ${item.description} ${item.category}`.toLowerCase().includes(query));
    const groups = items.reduce((all,item) => ((all[item.category || 'อื่น ๆ'] ||= []).push(item),all),{});
    const categories = Object.keys(groups);
    el('category-nav').innerHTML = categories.map((category,index)=>`<button class="category-button ${index===0?'active':''}" type="button" data-category="${escapeAttr(category)}">${escapeHtml(category)}</button>`).join('');
    el('menu-container').innerHTML = categories.map(category => `
      <section id="category-${slug(category)}" class="menu-section" data-category="${escapeAttr(category)}">
        <h2>${escapeHtml(category)}</h2><div class="menu-grid">${groups[category].map(menuCard).join('')}</div>
      </section>`).join('');
    el('menu-state').hidden = categories.length > 0;
    el('menu-state').textContent = query ? 'ไม่พบเมนูที่ค้นหา' : 'ยังไม่มีเมนู';
    el('menu-container').hidden = categories.length === 0;
  }
  function menuCard(item) {
    const quantity = state.cart.get(item.name)?.quantity || 0;
    const soldOut = item.status !== 'Available';
    const image = imageFor(item);
    return `<article class="menu-card ${soldOut?'sold-out':''}" data-name="${escapeAttr(item.name)}">
      ${image?`<img src="${escapeAttr(image)}" alt="${escapeAttr(item.name)}" loading="lazy" onerror="this.hidden=true">`:''}
      ${soldOut?'<span class="sold-out-label">หมดชั่วคราว</span>':''}
      <div class="menu-card-body"><h3>${escapeHtml(item.name)}</h3><p class="menu-description">${escapeHtml(item.description || '')}</p>
      <div class="menu-footer"><strong class="menu-price">${money(item.price)}</strong><div class="quantity">
        <button type="button" data-delta="-1" aria-label="ลดจำนวน" ${quantity===0?'disabled':''}>−</button><output>${quantity}</output><button type="button" data-delta="1" aria-label="เพิ่มจำนวน" ${soldOut?'disabled':''}>+</button>
      </div></div></div></article>`;
  }
  function changeQuantity(event) {
    const button = event.target.closest('button[data-delta]');
    if (!button) return;
    const holder = button.closest('[data-name]');
    const item = state.menu.find(entry => entry.name === holder.dataset.name);
    if (!item) return;
    const current = state.cart.get(item.name)?.quantity || 0;
    const quantity = Math.max(0,current + Number(button.dataset.delta));
    quantity ? state.cart.set(item.name,{...item,quantity,note:''}) : state.cart.delete(item.name);
    renderMenu();
    renderCart();
  }
  function totals() {
    const subtotal = [...state.cart.values()].reduce((sum,item)=>sum+Number(item.price)*item.quantity,0);
    const discountAmount = state.discount ? subtotal * Number(state.discount.value || 0) : 0;
    return {subtotal,discountAmount,total:subtotal-discountAmount};
  }
  function renderCart() {
    const items = [...state.cart.values()];
    el('cart-badge').textContent = items.reduce((sum,item)=>sum+item.quantity,0);
    el('cart-items').innerHTML = items.length ? items.map(item=>`<article class="cart-item" data-name="${escapeAttr(item.name)}"><div><h3>${escapeHtml(item.name)}</h3><p>${item.quantity} × ${money(item.price)}</p><div class="quantity"><button type="button" data-delta="-1">−</button><output>${item.quantity}</output><button type="button" data-delta="1">+</button></div></div><strong>${money(item.price*item.quantity)}</strong></article>`).join('') : '<p class="empty-message">ยังไม่มีรายการในตะกร้า</p>';
    el('cart-total').textContent = money(totals().total);
    el('place-order').disabled = items.length === 0;
  }
  function toggleCart(open) {
    el('cart-drawer').classList.toggle('open',open);
    el('cart-drawer').setAttribute('aria-hidden',String(!open));
    el('drawer-backdrop').hidden = !open;
    document.body.style.overflow = open ? 'hidden' : '';
  }
  function openCheckout() {
    if (!state.cart.size) return;
    state.order = null;
    el('payment-order-number').textContent = 'ระบบจะสร้างเลขออเดอร์เมื่อยืนยัน';
    el('payment-total').textContent = money(totals().total);
    el('payment-message').textContent='';
    el('payment-message').className='form-message';
    toggleCart(false);
    el('payment-dialog').showModal();
  }
  function selectPayment(event) {
    state.paymentMethod=event.currentTarget.dataset.method;
    document.querySelectorAll('.payment-tab').forEach(tab=>tab.classList.toggle('active',tab===event.currentTarget));
    el('qr-payment').hidden=state.paymentMethod==='Cash'; el('cash-payment').hidden=state.paymentMethod!=='Cash';
  }
  async function handleSlip(event) {
    const file=event.target.files[0]; if(!file) return;
    if(file.size>5*1024*1024){toast('ไฟล์สลิปต้องไม่เกิน 5 MB');event.target.value='';return;}
    state.slipData=await fileToDataUrl(file); el('slip-label').textContent=`แนบแล้ว: ${file.name}`;
  }
  function useCurrentLocation() {
    const button=el('use-current-location');
    const status=el('location-status');
    if(!navigator.geolocation){status.textContent='อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง กรุณาวางลิงก์ Google Maps แทน';status.className='location-status error';return;}
    button.disabled=true;status.textContent='กำลังค้นหาตำแหน่ง...';status.className='location-status';
    navigator.geolocation.getCurrentPosition(position=>{
      const latitude=position.coords.latitude.toFixed(6);
      const longitude=position.coords.longitude.toFixed(6);
      el('delivery-location').value=`https://www.google.com/maps?q=${latitude},${longitude}`;
      el('delivery-location').classList.remove('user-invalid');
      status.textContent='บันทึกตำแหน่งปัจจุบันแล้ว';status.className='location-status success';button.disabled=false;
    },error=>{
      const messages={1:'ไม่ได้รับสิทธิ์เข้าถึงตำแหน่ง กรุณาอนุญาต Location หรือวางลิงก์ Google Maps',2:'ค้นหาตำแหน่งไม่สำเร็จ กรุณาลองใหม่',3:'ใช้เวลาค้นหาตำแหน่งนานเกินไป กรุณาลองใหม่'};
      status.textContent=messages[error.code]||'ไม่สามารถใช้ตำแหน่งปัจจุบันได้';status.className='location-status error';button.disabled=false;
    },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }
  function deliveryDetails() {
    const name=el('customer-name');
    const phone=el('customer-phone');
    const address=el('delivery-address');
    const location=el('delivery-location');
    const values={customerName:name.value.trim(),customerPhone:phone.value.trim(),deliveryAddress:address.value.trim(),deliveryLocation:location.value.trim()};
    const digits=values.customerPhone.replace(/\D/g,'');
    if(values.customerName.length<2){name.setCustomValidity('กรุณากรอกชื่อผู้รับอย่างน้อย 2 ตัวอักษร');return invalidField(name);}
    if(digits.length<9||digits.length>10){phone.setCustomValidity('กรุณากรอกเบอร์โทรศัพท์ 9–10 หลัก');return invalidField(phone);}
    if(values.deliveryAddress.length<8){address.setCustomValidity('กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน');return invalidField(address);}
    if(values.deliveryLocation&&!location.checkValidity()){location.setCustomValidity('กรุณาใส่ลิงก์ Location ที่ขึ้นต้นด้วย https://');return invalidField(location);}
    values.customerPhone=digits;
    return values;
  }
  function invalidField(field){field.classList.add('user-invalid');field.reportValidity();field.focus();return null;}
  async function confirmPayment() {
    const message=el('payment-message');
    const customer=deliveryDetails();
    if(!customer){message.textContent='กรุณาตรวจสอบข้อมูลจัดส่ง';message.className='form-message error';return;}
    if(state.paymentMethod!=='Cash'&&!state.slipData){message.textContent='กรุณาแนบสลิปก่อนยืนยัน';message.className='form-message error';return;}
    const button=el('confirm-payment');button.disabled=true;button.textContent='กำลังสร้างออเดอร์...';
    try {
      if(!state.order){
        const details={tableNumber:'Delivery (จัดส่ง)',customerCount:1,items:[...state.cart.values()].map(({name,price,note,quantity})=>({name,price,note,quantity})),discount:state.discount,...customer};
        const response=await RoseApi.post('order',details);
        state.order={orderNumber:response.orderNumber,total:totals().total};
        el('payment-order-number').textContent=state.order.orderNumber;
      }
      button.textContent='กำลังบันทึกการชำระเงิน...';
      await RoseApi.post('payment',{orderNumber:state.order.orderNumber,paymentMethod:state.paymentMethod,cashReceived:0,changeGiven:0,imageData:state.slipData});
      message.textContent='ชำระเงินเรียบร้อย ขอบคุณที่อุดหนุน ROSE Café ค่ะ';message.className='form-message success';
      state.cart.clear();state.discount=null;el('discount-select').value='';renderMenu();renderCart();
      setTimeout(()=>{el('payment-dialog').close();state.slipData='';state.order=null;el('slip-input').value='';el('slip-label').textContent='แนบสลิปการโอนเงิน';},1800);
    } catch(error){message.textContent=state.order?`สร้างออเดอร์ ${state.order.orderNumber} แล้ว แต่บันทึกการชำระเงินไม่สำเร็จ: ${error.message}`:error.message;message.className='form-message error';}
    finally{button.disabled=false;button.textContent='ยืนยันสั่งซื้อและชำระเงิน';}
  }
  function fileToDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('อ่านไฟล์สลิปไม่สำเร็จ'));reader.readAsDataURL(file);});}
  function toast(message){const node=el('toast');node.textContent=message;node.classList.add('show');setTimeout(()=>node.classList.remove('show'),3000);}
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function escapeAttr(value){return escapeHtml(value);}
}());
