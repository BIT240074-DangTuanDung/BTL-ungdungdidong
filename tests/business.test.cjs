const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
function load(file){const output=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const module={exports:{}};new Function('module','exports',output)(module,module.exports);return module.exports;}
const {calcInvoiceTotal}=load('lib/format.ts');
const {validateInvoice,paymentMonth}=load('lib/business.ts');
const invoice={roomId:'r1',tenantId:'t1',period:'2026-11',rent:3000000,electricityOld:10,electricityNew:110,waterOld:5,waterNew:10,other:100000,otherNote:'Internet',status:'unpaid'};
test('Tiền phòng + 100 kWh + 5 m3 + Internet = 3.600.000',()=>assert.equal(calcInvoiceTotal(invoice,3500,30000),3600000));
test('Đơn giá mới không thay đổi hóa đơn đã chốt',()=>assert.equal(calcInvoiceTotal({...invoice,electricityRate:3500,waterRate:30000},9000,90000),3600000));
test('Từ chối chỉ số giảm và số không hợp lệ',()=>{assert.ok(validateInvoice({...invoice,electricityNew:9},[]));assert.ok(validateInvoice({...invoice,other:NaN},[]));assert.ok(validateInvoice({...invoice,rent:-1},[]));});
test('Không cho lập trùng hóa đơn hoặc kỳ không hợp lệ',()=>{assert.ok(validateInvoice(invoice,[{...invoice,id:'i1'}]));assert.ok(validateInvoice({...invoice,period:'2026-13'},[]));assert.equal(validateInvoice(invoice,[]),undefined);});
test('Doanh thu phân tháng theo giờ Việt Nam',()=>{assert.equal(paymentMonth('2026-10-31T18:00:00Z'),'2026-11');assert.equal(paymentMonth(undefined),undefined);});
