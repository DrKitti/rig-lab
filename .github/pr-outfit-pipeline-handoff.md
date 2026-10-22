# Prepare Kolahon Outfit Pipeline and Rig Lab integration handoff

## สรุป

รวบรวมผลทดลอง outfit เป็น checkpoint ที่ clone แล้วใช้งานและส่งต่อเข้าโปรเจค Kolahon ได้
แยก runtime, เครื่องมือทำชุด, source/reference และประวัติทดลองให้ชัดเจน
พร้อมอธิบายสิ่งที่ผ่านแล้ว สิ่งที่ผิดพลาด และข้อจำกัดสำหรับ agent ที่รับงานต่อ

## สิ่งที่เปลี่ยน

- ใช้ skeleton กลาง `neutral-c-v5` ร่วมกันทั้ง Shared Master, Neutral และ Time Travel
  - ลำตัวสองท่อน จุดหมุนเอว และตำแหน่งแขนที่ผ่านการเลือกแล้ว
  - เข่า 52%, จุดหมุนเท้าที่ตาตุ่ม, foot bone แนวนอน และ foot plant/load สูงสุด 4%
  - คง artwork offset ของ arm_B แยกจากจุดเริ่ม bone; ไม่เปลี่ยน anatomy ตามชุด
- เก็บ rig หลักเป็น `shared-master`, `neutral`, `time-travel` พร้อม alias สำหรับชื่อ/URL เดิม
- ใช้ animation library กลางต่อ skeleton; มี revision/conflict protection สำหรับการเซฟข้ามแท็บ
- นำ Neutral และ Time Travel parts ที่เลือกแล้ว รวมผลปรับสีทุกวัสดุ มาไว้ใน stable runtime paths
- เก็บ source, prompt ตัวอย่างที่ผ่าน, garment guides และสูตรสีที่รันซ้ำได้แยกจาก runtime
- รวมมาตรฐานจุดอ้างอิง พื้นที่ซ้อนรอยต่อ torso รับแขน prompt/ref สี และ renderer QA
  พร้อม infographic และภาพเปรียบเทียบจริง
- เพิ่ม runtime exporter: engine-free TypeScript, hydrated rig JSON, textures, specs และ hash inventory
- เพิ่ม automated tests, หน้า Pixi `/qa/` และ GitHub Actions สำหรับ checks/build/export

## เก็บกวาดไฟล์เดิมใน main

- แทน rig/asset paths เดิมด้วยชื่อ canonical โดยเก็บ snapshot และ original art ไว้ใน archive
- เอา rest-arm/drawn-pose workflow เก่าออกจากทางใช้งานปัจจุบัน
- ย้ายรูปสเปก Hero/ตัวอย่างแขนเก่า 4 รูปออกจากพื้นที่ current specs ไป `docs/archive/rig-spec/`
- เก็บ art-direction รุ่นเก่าไว้ใน archive และให้คู่มือปัจจุบันอ้างมาตรฐาน Neutral/v5 ที่เลือกแล้ว
- แก้ path ค้างใน `proportions.json`; ระบุว่า width samples เดิมเป็น diagnostic ไม่ใช่ skeleton ใหม่
- เก็บเครื่องมือ/reference ที่ยังมีผู้ใช้อยู่ รวมถึง `match_palette.py` ที่ material matcher ยัง import
- ไม่เปลี่ยนไฟล์ approved, ไม่ลบประวัติที่จำเป็น และไม่รวม ignored drafts/ไฟล์ local ที่ไม่เกี่ยวข้อง

รายละเอียดรายกลุ่มไฟล์: `docs/repository-audit.md`

## Verification

- [x] `npm test` — repository/spec/assets/docs validation + 9 Node tests
- [x] `npm run test:pipeline` — 3 Python tests
- [x] `npx tsc --noEmit --noUnusedLocals --noUnusedParameters`
- [x] `npm run build`
- [x] `npm run export:runtime` — 3 rigs / 15 runtime textures; ไม่ต้องใช้ Vite server หรือ ignored drafts เพื่อเล่น
- [x] ทดสอบ checkpoint จาก Git archive ในโฟลเดอร์สะอาด พร้อมติดตั้ง dependencies ใหม่
- [x] รันสูตรสีทั้ง 3 สูตรจาก committed inputs; ภาพผลลัพธ์ 9 ชิ้นตรงกับ runtime ทุกพิกเซล
- [x] ตรวจภาพ Setup และ planted crouch ใน Pixi; เก็บภาพและข้อจำกัดไว้ในเอกสาร

ผล clean-checkout และหลักฐานภาพ: `docs/verification.md`
รายการด้านบนเป็นผลตรวจในเครื่อง; ให้ดูสถานะ hosted CI ของ PR แยกต่างหาก

## เริ่ม review / รับงานต่อ

1. `docs/PROJECT_HANDOFF.md` — สิ่งที่มี สถานะ ข้อห้าม และงานถัดไป
2. `docs/integration.md` — renderer boundary, การผูก mesh/texture และแนวทางย้ายเข้า Phaser
3. `docs/outfit-pipeline/standard.md` — มาตรฐานกลางล่าสุด
4. `docs/experiments.md` — สิ่งที่เคยลองแล้วไม่เวิร์กและเหตุผล

## ยังไม่รวม / ข้อจำกัด

- ยังไม่มี Phaser renderer adapter หรือผลทดสอบในเกมหลัก; ห้ามทับ package/config/agent instructions ของเกมทั้งก้อน
- ยังต้องพิสูจน์อีกหนึ่งชุดตั้งแต่ full body จนประกอบ โดยห้ามเปลี่ยน skeleton
- ยังไม่ใช่ animation pack ครบสำหรับเกม; walk/run/attack และ gameplay state integration เป็นงานต่อ
- Foot plant ปัจจุบันเป็น flat-floor rig-space ไม่ใช่ world-space locomotion/terrain contact system
- บูตชุด Shared Master เก่ายังมี cuff shear ตอนย่อลึก; ไม่ถือว่าเก็บ deformation ทุกชุดเสร็จแล้ว
- Alpha-fringe QA, atlas/resolution/performance, accessory layers และ production approval ยังต้องทำต่อ

PR นี้เป็นการส่งต่อ prototype ที่มีหลักฐานและขอบเขตชัดเจน ไม่ใช่การประกาศพร้อม production
