export const MAX_FILES=5,MAX_SIZE=10*1024*1024,SESSION_MS=30*60*1000;
export const CATEGORIES=['Dugaan pungutan liar','Penyalahgunaan anggaran','Penyalahgunaan fasilitas','Lainnya'];
export function validateReport(data,today=new Date().toISOString().slice(0,10)){
 const errors={};
 if(!CATEGORIES.includes(data.kategori))errors.kategori='Pilih kategori laporan.';
 for(const [key,label,min,max] of [['judul','Judul',10,120],['kronologi','Kronologi',30,2000],['lokasi','Lokasi',5,200],['pihak','Pihak terkait',3,150]]){
 const n=String(data[key]||'').trim().length;if(n<min||n>max)errors[key]=`${label} harus berisi ${min}–${max} karakter.`;
 }
 if(!/^\d{4}-\d{2}-\d{2}$/.test(data.tanggal||'')||Number.isNaN(Date.parse(data.tanggal))||new Date(data.tanggal).toISOString().slice(0,10)!==data.tanggal||data.tanggal>today)errors.tanggal='Isi tanggal kejadian yang valid, tidak melebihi hari ini.';
 return errors;
}
export function validateFiles(files){
 if(files.length<1)return 'Tambahkan minimal satu bukti contoh (JPG, PNG, atau PDF).';
 if(files.length>MAX_FILES)return 'Maksimal 5 berkas bukti.';
 const types={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',pdf:'application/pdf'};
 for(const file of files){const ext=file.name.split('.').pop().toLowerCase();if(!types[ext]||file.type!==types[ext])return 'Jenis berkas belum didukung. Gunakan JPG, PNG, atau PDF.';if(file.size===0||file.size>MAX_SIZE)return 'Setiap berkas harus berisi data dan berukuran maksimal 10 MB.';}
 return '';
}
export function isExpired(report,now=Date.now()){return !report||!Number.isFinite(report.expires)||now>=report.expires;}
export function sanitizeForStorage(data){return Object.fromEntries(['kategori','judul','kronologi','tanggal','lokasi','pihak'].map(k=>[k,String(data[k]||'').trim()]));}
