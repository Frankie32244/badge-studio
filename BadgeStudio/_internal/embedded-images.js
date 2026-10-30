/* BadgeStudio additions: image extraction, explicit field binding. */
const EmbeddedImages = {
  async inject(buffer, workbook) {
    const response=await fetch('/api/extract-images',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:buffer});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error || '照片提取失败');
    const occupied=new Set(); let count=0;
    for(const image of result.images){
      const ws=workbook.Sheets[image.sheet]; if(!ws)continue;
      const key=image.sheet+'!'+image.cell;
      if(occupied.has(key)){result.warnings.push(key+' 有多张图片，仅绑定第一张');continue;}
      occupied.add(key);
      ws[image.cell]={t:'s',v:image.dataUrl};
      const point=XLSX.utils.decode_cell(image.cell);
      const range=XLSX.utils.decode_range(ws['!ref']||image.cell);
      range.s.r=Math.min(range.s.r,point.r);range.s.c=Math.min(range.s.c,point.c);
      range.e.r=Math.max(range.e.r,point.r);range.e.c=Math.max(range.e.c,point.c);
      ws['!ref']=XLSX.utils.encode_range(range);count++;
      const head=XLSX.utils.encode_cell({r:range.s.r,c:point.c});
      if(!ws[head]||!ws[head].v)ws[head]={t:'s',v:'照片_'+XLSX.utils.encode_col(point.c)};
    }
    window.setTimeout(()=>alert('已提取 '+count+' 张图片。\n照片按其左上角所在单元格匹配员工行。\n'+result.warnings.join('\n')),100);
  },
  bindSelected(){
    const obj=App.canvas.getActiveObject(), ds=App.state.dataSource;
    if(!obj||!ds.isActive)return alert('先导入 Excel，再选中画布上的文字或照片');
    const field=prompt('输入要绑定的完整列名：\n'+ds.headers.join('、'),obj.dataBinding?.field||'姓名');
    if(field===null)return;if(!ds.headers.includes(field))return alert('该字段不存在，请从上面的列名中选择');
    obj.dataBinding={type:'variable',sheet:ds.currentSheet,field};obj._imgLoaded=false;
    App.dataSource.renderPage(App.state.currentDataIndex||0);App.dataSource.refreshBindingState();App.ui.updateInspector();
  }
};
window.addEventListener('DOMContentLoaded',()=>{
 const bar=document.createElement('div');bar.style='display:flex;align-items:center;justify-content:center;align-self:center;flex-shrink:0;margin: auto 8px 16px;white-space:nowrap;background:#135d4c;color:white;padding:10px;border-radius:8px;font:13px sans-serif;box-shadow:0 2px 8px #aaa';
 for(const [label,action]of [['绑定选中对象',()=>EmbeddedImages.bindSelected()],['导出照片 ZIP',async()=>{
   const ds=App.state.dataSource;if(!ds.isActive)return alert('请先导入 Excel');
   const result=[];ds.data.forEach((r,i)=>Object.entries(r).forEach(([f,v])=>{if(String(v).startsWith('data:image/'))result.push({name:String(r['编号']||i+1)+'_'+f,dataUrl:v});}));
   const response=await fetch('/api/photos-zip',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(result)});
   if(!response.ok)return alert('导出失败');const url=URL.createObjectURL(await response.blob());const a=document.createElement('a');a.href=url;a.download='员工照片.zip';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 }]]){const b=document.createElement('button');b.textContent=label;b.style='padding:6px 9px;margin:0 3px;border:1px solid #a5dbbf;border-radius:4px;cursor:pointer';b.onclick=action;bar.appendChild(b);}document.querySelector('aside').appendChild(bar);
});
