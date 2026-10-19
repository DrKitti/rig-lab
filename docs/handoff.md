# Handoff: Rig Lab หลัง cleanup

วันที่: 2026-10-19 — sandbox `D:\Ject\test2`

## สถานะปัจจุบัน

เหลือ rig ที่ดูแลเพียง `src/data/hero-c3-B7.rig.json` เป็น shared production master
ใช้ร่างกายและชุดเดียวกันทุกเพศ เปลี่ยนหัว/ผมตามตัวละคร มี 16 bones, 6 parts,
5 textures, leg IK สองข้าง และคลิป `idle` 2 วินาที ส่วน game หลัก Kolahon
อยู่เครื่องอื่นและใช้ Phaser; ที่นี่ยังมี renderer เฉพาะ PixiJS

คู่มือเริ่มงานอยู่ใน `README.md` กติกาอยู่ใน `AGENTS.md` และวิธีทำชุดอยู่ใน
`docs/character-pipeline.md` เอกสารนี้บันทึกสถานะ ไม่แทนกติกาทั้งสองไฟล์

## สิ่งที่จัดระเบียบ

- ย้าย texture master แบบตรวจ hash ให้ตรงต้นฉบับ ไป `assets/rigs/hero-c3/`
  และแก้เฉพาะ path ใน JSON; geometry, bones, pivots, IK และ animation คงเดิม
- ตั้งชื่อ texture ตามหน้าที่: `head.png`, `torso.png`, `arm_F.png`, `arm_B.png`,
  `leg.png` โดยทั้งสองขาใช้ `leg.png` ร่วมกัน
- ลบ rig ทดลองอีก 33 ไฟล์, draft/ภาพเปรียบเทียบ/shot เก่า, template รุ่นเก่า,
  สคริปต์ migration และสคริปต์ทดลองที่ไม่อยู่ใน pipeline ที่ดูแลแล้ว
- ลบ handoff และ migration summary ฉบับเก่า แล้วรวมสถานะที่ยังเกี่ยวข้องไว้ที่นี่
- เหลือ Python tools 7 ไฟล์: align, fit, assemble, check proportions, build rig,
  set rest arms และ frame helper; profile เหลือ `shared` เท่านั้น
- Picker แสดง master ตัวเดียว และ static build ใช้ master พร้อมรวม rig/texture
  ที่ JSON อ้างถึงลง `dist/` ด้วย
- ตั้ง ignore สำหรับ dependencies, build, draft, Python cache และไฟล์เครื่องส่วนตัว
  local agent skill ใน `.agents/` กับ installer lock ยังอยู่ในเครื่องและไม่เข้า Git

เก็บชื่อ rig `hero-c3-B7` และชื่อ reference ใน `docs/rig-spec/` ที่คู่มือ/เครื่องมือใช้
เพื่อให้คำสั่งและข้อมูลเดิมยังต่อกันได้ ไฟล์ `pose-arms-out-male.png` คือ shared pose
ตามชื่อประวัติเดิม ไม่ใช่ข้อกำหนดให้แยกร่างชาย/หญิง

## การกู้คืน

ก่อนลบได้สำรอง assets, source, docs, tools และไฟล์ตั้งค่าหลักเป็น
`D:\Ject\test2-before-cleanup-20261019.zip` ไว้นอกโปรเจกต์ ตรวจเปิด archive ได้
1,351 entries สำเนานี้มี master ก่อนย้าย path และงานทดลองที่ลบไป
อย่าแตกทับ working folder ทั้งชุดหากต้องการกู้แค่ไฟล์เดียว

Cleanup ลบ 1,306 ไฟล์ รวมประมาณ 484 MiB (รวม build เก่า, reference ซ้ำหนึ่งไฟล์
และ reference ดีไซน์เก่าที่ไม่ถูกใช้) ไม่แตะ `assets/approved/`
ไม่มีประวัติ Git ก่อนเริ่ม cleanup; archive นี้เป็นจุดกู้คืนก่อนเริ่มใช้ Git

## บทเรียนและงานที่ยังไม่เสร็จ

- ยังไม่มีชุดใหม่ที่ผู้ใช้อนุมัติทั้งดีไซน์และผล renderer ชุด Soulbow เคยผ่านเฉพาะ
  การแก้แขนไกล ส่วน traveler มีปัญหาแขน/ฮู้ด และ paladin ยังไม่เลือก concept
  ไฟล์ทดลองเหล่านี้อยู่ใน archive แทน working folder แล้ว
- ออกแบบสามชุดบน shared master โดยตรง ให้ผู้ใช้เลือก full body ก่อนแยกชิ้น
  การ fit ผ่านไม่ได้แปลว่าดีไซน์ผ่าน และไม่ควรเจน winner ซ้ำจนดีไซน์เปลี่ยน
- แขนไกลเป็นภาพอีกด้านของร่างเดียวกัน ห้าม mirror แขนใกล้ ใช้ master arm reference
  ช่วยส่วนต้นแขนที่ถูกบัง; เสื้อ/ฮู้ดไม่ใช่ตำแหน่ง shoulder pivot ใหม่
- Near fist เห็นหลังมือ; far fist เห็นนิ้วกำเรียงแนวตั้งและโป้งอยู่ด้านหน้า
  ใช้ 3 นิ้ว + โป้ง ตรวจมุมมือใน renderer ด้วย
- ความสูง/joints/sole level คงเดิม ความกว้างชุดเป็น diagnostic ไม่มีเปอร์เซ็นต์
  บังคับแขนไกล และไม่ปรับ shared skeleton เพื่อชดเชยภาพผิดสัดส่วน
- `--pad-x` และ frame sidecar มี implementation แล้ว แต่ยังไม่มีหลักฐาน regression
  ครบ full pipeline สำหรับภาพกางแขนกว้าง อย่าถือว่า workflow นี้ผ่าน production
- เสื้อคลุมบังแขนใกล้, cape, กระโปรงยาว, อาวุธและ layer เสริมยังต้องออกแบบ runtime/
  builder เพิ่ม การวาดติด torso ไม่ทำให้มันบัง near arm ได้อัตโนมัติ
- Master ใช้ ankle blend เดิม 56; builder ให้ชุดใหม่เป็น mesh 12×48 กับ blends
  `[8,160]` ตามบทเรียนเดิม ห้ามแก้ master เพียงให้ค่าตรงกับ builder

## นำไปใช้กับ Kolahon

ย้าย `src/rig/core/` ได้โดยไม่พา editor หรือ Pixi ไปด้วย เขียน renderer ฝั่ง Phaser
ตาม `src/rig/pixi/SkeletonView.ts`: update skeleton, ตั้ง sprite transforms,
deform mesh และเรียง draw order ย้าย rig JSON กับ texture แล้วแก้ path ให้ตรงเกม
ตรวจ standing, idle, elbow 90° และ planted-feet crouch เทียบ Pixi ที่ขนาด 200–240 px

## Git และการตรวจรับ

ปลายทางที่ผู้ใช้ระบุคือ `https://github.com/DrKitti/rig-lab.git`
ตรวจด้วย `git ls-remote --symref` วันที่ 2026-10-19 แล้วไม่มี HEAD หรือ branch เดิม
เตรียม initial import บน `main` และตั้ง `origin` ไปปลายทางนี้; รอบนี้ยังไม่ push
หากภายหลัง remote มีประวัติขึ้นมา ให้ fetch และตรวจการรวมก่อน ห้าม force-push

ผลตรวจหลัง cleanup:

- `npm run typecheck` และ `npm run build` ผ่าน
- Python tools ทั้ง 7 ไฟล์ parse และ import ได้ โดยมี NumPy, Pillow และ OpenCV ในเครื่อง
- เทียบ master กับ JSON ใน archive แล้ว ทุก field นอกจาก texture paths ตรงกันทั้งหมด
- Static HTTP ส่ง rig JSON และ texture PNG ทั้ง 5 ไฟล์เป็น 200 พร้อม byte ตรง source
- เปิด static preview ใน browser เห็น master พร้อม texture และเล่น `idle` ได้
- ไม่ได้รันสร้าง outfit ใหม่ครบ pipeline จึงยังไม่ยืนยัน padded workflow หรือ visual QA
  ของชุดใหม่ที่ยังไม่มีภาพอนุมัติ

หลังตรวจ initial commit ในเครื่อง สามารถ push ด้วย `git push -u origin main`
สำเนา backup อยู่นอก repository; `node_modules/`, `dist/`, draft และ local skill
ไม่รวมใน initial import
