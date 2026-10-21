# Handoff: Rig Lab หลัง cleanup

## Checkpoint ล่าสุด — 2026-10-22: shared C-v4

หัวข้อนี้แทนสถานะปัจจุบันที่บันทึกไว้เก่าด้านล่าง (ด้านล่างเก็บเป็นประวัติ)

- Skeleton กลางคือ `neutral-c-v4` ใน master `hero-c3-B7`, Neutral
  `neutral-skeleton-c-v1` และ Time Travel `time-travel-torso-fresh-master-v3`.
- ผู้ใช้รับศอก arm_F ที่เลื่อนซ้าย 14 หน่วย และจุดต้นแขน/ศอก arm_B จากรุ่นทดลองแล้ว
  ทั้งสาม rig ใช้ geometry เดียวกัน; ไหล่ F และปลายมือทั้งสองยังอยู่จุดเดิม.
- ตำแหน่งภาพ arm_B ขวา 12.195347 / ขึ้น 6.001767 เป็นค่ากลาง แยกจาก bone origin.
  Builder อ่าน artwork anchor จาก `docs/rig-spec/shared-arm-placement.json`
  ไม่ย้ายภาพไปตรง bone ใหม่ และไม่สร้างกระดูกใหม่ตามแต่ละชุด.
- แขน mesh 16×64 blend 40 lower-over-upper; ขา blend เข่า 8 / เท้า 160.
  Geometry ขา, root และ torso ไม่เปลี่ยนในรอบปรับแขนนี้.
- UI: blend ศอก/เข่า/เท้าแบบ dropdown ใช้สองข้าง มี A/B preview,
  dock ปรับขนาด/ย่อได้, toolbar ซ่อนได้, save เก็บค่าของแต่ละ rig.
  ลบ script จัดแขน rest เก่าและปุ่มท่าที่วาดแล้ว.
- รุ่นทดลองแขนฟ้ายังอยู่สำหรับอ้างอิง แต่ไม่มี authority เหนือ spec กลาง.
  รุ่นทดลองศอกส้มสองชุดถูก archive และลบออกจากการใช้งานแล้ว.
- ตรวจผ่าน: shared geometry + attachment/build regression, preview ทิศงอขา,
  blend settings, TypeScript และ production build. นี่ไม่ใช่การรับ animation
  production ทุกท่า หรือยืนยันว่าชุดใหม่เจน one-shot แล้วผ่านได้เสมอ.
- Checkpoint เก็บ texture ที่ rig ในเมนูอ้างถึงและ migration snapshots ที่ regression
  ต้องใช้ แม้ยังอยู่ใน draft paths; ไม่ใช่การ promote ภาพทั้งหมดเป็น production assets.

ถัดไป: ทดสอบการงอ/กางแขนสองข้างและการย่อขาบน Neutral กับ Time Travel ชุดหลัก
เพื่อยืนยัน deformation หลังล็อก C-v4; จากนั้นล็อก template/landmark การแยก part
และลอง pipeline เต็มกับชุดใหม่อีกหนึ่งชุดโดยไม่เปลี่ยน skeleton. เมื่อผ่านแล้วค่อย
promote runtime textures ไป permanent paths และทดสอบใน Kolahon (Phaser) จริง.

วันที่: 2026-10-20 — sandbox `D:\Ject\test2`

## สถานะปัจจุบัน

เหลือ rig ที่ดูแลเพียง `src/data/hero-c3-B7.rig.json` เป็น shared production master
ใช้ร่างกายและชุดเดียวกันทุกเพศ เปลี่ยนหัว/ผมตามตัวละคร มี 16 bones, 6 parts,
5 textures, leg IK สองข้าง และคลิป `idle` 2 วินาที ส่วน game หลัก Kolahon
อยู่เครื่องอื่นและใช้ Phaser; ที่นี่ยังมี renderer เฉพาะ PixiJS

คู่มือเริ่มงานอยู่ใน `README.md` กติกาอยู่ใน `AGENTS.md` และวิธีทำชุดอยู่ใน
`docs/character-pipeline.md` เอกสารนี้บันทึกสถานะ ไม่แทนกติกาทั้งสองไฟล์

อัปเดต neutral full body 2026-10-20: เก็บ base ที่ผู้ใช้รับหลังตรวจแขนแล้วที่
`assets/approved/neutral-body-v1/fullbody.png` พร้อมภาพต้นฉบับ ImageGen, prompt และผลวัด
เป็นการรับเฉพาะ full-body visual base ยังไม่รับ parts/rig/animation ของ neutral ตัวใหม่
ท่อนแขนใกล้ช่วงกลางเทียบ master `78.25/79.25 px`, ช่วงก่อนข้อมือ `75/78.5 px`;
แขนไกล `66/65.5 px` เท้าใกล้สูงกว่าเส้น master 1 px และเท้าไกล 2 px อยู่ในเกณฑ์ 1% ของความสูง master
ขั้นถัดไปทดลองแขนใกล้ชิ้นเดียวและตรวจประกอบ/งอข้อก่อน ไม่เปลี่ยน production rig

### ล่าสุด: Neutral pipeline และ Time Travel PASS (2026-10-20)

ผู้ใช้ตั้งชื่อ **Neutral pipeline** แยกแล้ว: สร้าง full body ใหม่โดยแนบ neutral เป็น
edit target/ร่างขั้นต่ำข้างใน และ ref ชุดใหม่เป็นดีไซน์ข้างนอก ไม่แนบ master ที่ใส่ชุด
หรือภาพ Time Travel ที่ผ่านเป็น volume reference อัตโนมัติ หลัก prompt คือ
“เพิ่มพื้นที่ให้เสื้อผ้า ไม่ใช่เพิ่มเนื้อให้ตัวละคร” ให้เสื้อมี ease ไม่รัดหน้าท้อง และ
กางเกง relaxed-fit มีผ้าเผื่อ ไม่ไล่ทรงเข่า–น่อง แต่ไม่โป่งเป็นบอลลูน/ก้อน ๆ
สูตรและ prompt block กลางอยู่ที่ `docs/neutral-pipeline.md`

อัปเดตเรื่องปรับลายเส้น: ผู้ใช้ให้บันทึกว่าสามารถแนบภาพเพิ่มเป็น **Style reference
เท่านั้น** ใช้กำกับวิธีวาดเส้น น้ำหนักเส้น วิธีลงสี รูปทรงเงา และ texture ไม่ใช่ให้ลอก
ร่าง สัดส่วน ความสูง โพส ตัวละคร ชุด หรือ palette ของภาพนั้น Neutral/master ยังล็อกร่าง
และ ref ชุดใหม่ยังล็อกดีไซน์/สี ขอบเขตกลางอยู่ใน `docs/art-direction/README.md`
พร้อม optional prompt block ใน `docs/neutral-pipeline.md`; ไม่ใช่ ref ปริมาตรชุด
และไม่ใช่ข้อบังคับให้แนบทุก call การแนบ style ref ไม่รับประกันว่าข้อต่อ/ความสูงจะไม่ drift

เก็บผลหนึ่ง call ล่าสุดที่ผู้ใช้รับเป็น **PASS ด้าน full-body visual/design** ไว้ที่
`assets/approved/time-travel-neutral-ease-v1/` พร้อม raw, aligned, prompt และผลวัด
ภาพนี้เป็นตัวอย่างผลที่รับ ไม่ใช่ default ref หรือ master ใหม่ ผลวัดเดิม +6/+2 px
ยังเก็บตามจริง และผ่าน height gate ใหม่ที่ 1% ของความสูง master แต่ยังไม่ใช่
neutral runtime-parts หรือ animation PASS

`Traveler pipeline` ยังเป็น master-edit ทีละ part ตามเดิม การตั้ง Neutral pipeline
ครั้งนี้ครอบคลุมขั้น full body ไม่ได้สั่งเปลี่ยน scaffold ของทุก part โดยอัตโนมัติ
ข้อความแผนทดลอง neutral parts ด้านล่างเป็นประวัติข้อเสนอ ไม่ใช่งานที่ผ่านแล้วหรือ
คำสั่งให้ย้าย Traveler ไปใช้ neutral parts ทันที

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
  การแก้แขนไกล ส่วน traveler มีปัญหาแขน/ฮู้ด ไฟล์ทดลองที่ยังเก็บอยู่เป็นงานศึกษา
  และต้องผ่าน full pipeline ใหม่ก่อนนำไปใช้จริง
- ออกแบบสามชุดบน shared master โดยตรง ให้ผู้ใช้เลือก full body ก่อนแยกชิ้น
  การ fit ผ่านไม่ได้แปลว่าดีไซน์ผ่าน และไม่ควรเจน winner ซ้ำจนดีไซน์เปลี่ยน
- แขนไกลเป็นภาพอีกด้านของร่างเดียวกัน ห้าม mirror แขนใกล้ ใช้ master arm reference
  ช่วยส่วนต้นแขนที่ถูกบัง; เสื้อ/ฮู้ดไม่ใช่ตำแหน่ง shoulder pivot ใหม่
- Near fist เห็นหลังมือ; far fist เห็นนิ้วกำเรียงแนวตั้งและโป้งอยู่ด้านหน้า
  ใช้ 3 นิ้ว + โป้ง ตรวจมุมมือใน renderer ด้วย
- ความสูง/joints/sole level คงเดิม โดยหลัง align เส้นฝ่าเท้าต้องคลาดจาก master ไม่เกิน
  **±1% ของความสูง master** เท่านั้น เกินกว่านี้ให้ fail และห้ามเริ่มสร้าง parts แม้ดีไซน์จะผ่าน;
  ค่าประมาณ ±5 px ที่เคยเขียนกับ anchor ของคอ/ไหล่/สะโพก/เข่าเป็นเพียง warning
  สำหรับตรวจด้วยตา ไม่ใช่ pass range แยกต่างหาก; ถ้าข้อต่อ drift ชัดเจนให้ fail แม้พื้นเท้าจะผ่าน
  ความกว้างชุดเป็น diagnostic ไม่มีเปอร์เซ็นต์บังคับแขนไกล และไม่ปรับ shared skeleton
  หรือหวังให้ขั้น fit ขาช่วยซ่อนภาพผิดสัดส่วน
- `--pad-x` และ frame sidecar มี implementation แล้ว แต่ยังไม่มีหลักฐาน regression
  ครบ full pipeline สำหรับภาพกางแขนกว้าง อย่าถือว่า workflow นี้ผ่าน production
- เสื้อคลุมบังแขนใกล้, cape, กระโปรงยาว, อาวุธและ layer เสริมยังต้องออกแบบ runtime/
  builder เพิ่ม การวาดติด torso ไม่ทำให้มันบัง near arm ได้อัตโนมัติ
- Master ใช้ ankle blend เดิม 56; builder ให้ชุดใหม่เป็น mesh 12×48 กับ blends
  `[8,160]` ตามบทเรียนเดิม ห้ามแก้ master เพียงให้ค่าตรงกับ builder

## ทิศทาง Rig Lab: master rig, animation และ outfit แยกหน้าที่

ข้อสรุปร่วมล่าสุดคือ Rig Lab ควรดูแลข้อมูลสามชั้นแยกกัน:

1. **Rig Setup** — สร้างและแก้ master skeleton ของตัวละครชนิดหนึ่ง เช่น Hero หรือ
   monster แต่ละโครง: bones, hierarchy, setup pose, IK, mesh defaults และ slot/draw order
2. **Animation** — สร้างคลิปกลางของ master skeleton นั้น โดยเปิด skin หลายชุดสลับตรวจได้
3. **Outfit Preview / QA** — โหลดผลวางชิ้นของชุดใหม่มาแสดงบน master เดิม ตรวจและแก้
   attachment เฉพาะเมื่อจำเป็น; ไม่ใช่ขั้นตอนสร้าง skeleton ใหม่

ตัวเลือกใน editor ควรแยก `Rig` ออกจาก `Skin/Outfit`: เปลี่ยน Rig แล้วเปลี่ยน skeleton
พร้อมชุด animation ที่เข้ากัน ส่วนเปลี่ยน Outfit ให้เปลี่ยนเฉพาะ texture/attachment ขณะที่
skeleton, IK และ animation คงเดิม โครงนี้รองรับการเพิ่ม master skeleton ของมอนสเตอร์ในอนาคต
และให้หลาย skin ใช้ animation ร่วมกันภายใน rig เดียว

### Outfit Preview / QA ไม่ทำงานซ้ำกับ pipeline

`fit_pieces.py` และ `assemble_pieces.py` ยังเป็นผู้วางชิ้นและเขียน `pieces.json`
อัตโนมัติตามเดิม เมื่อเปิดชุดใน Outfit Preview editor ต้องอ่านผลนั้นแล้วประกอบให้ทันที;
ผู้ใช้ไม่ควรต้องคลิกระบุ joint ใหม่ทุกชุด หากทุกอย่างผ่านให้รับชุดได้เลย

โหมดนี้มีไว้แยกสาเหตุเมื่อผลไม่ผ่าน:

- **วางผิด** — ภาพดีแต่ placement/pivot/rotation คลาด: แสดง full-body ghost, master
  joints และระยะคลาด แล้วอนุญาตให้ลากภาพหรือแก้ attachment
- **ภาพผิด** — pivot ตรงแล้วแต่แขนสั้น บาง ขาดส่วนที่อยู่ใต้ torso หรือ fist ผิดด้าน:
  ให้เปลี่ยน/สร้าง PNG ชิ้นนั้นใหม่ ห้ามย้าย pivot หรือเปลี่ยน skeleton เพื่อซ่อนปัญหา
- **deformation ผิด** — ภาพและตำแหน่งถูก แต่ศอก/เข่า/เอวบี้เมื่อขยับ: ปรับ mesh override
  ของชุดนั้นได้โดยไม่แก้ mesh default ของ master

Manual joint marking เช่น `shoulder/elbow/fist` หรือ `hip/knee/foot` เป็นเครื่องมือแก้
fallback เฉพาะเมื่อค่าที่ pipeline คำนวณผิด ไม่ใช่ขั้นตอนบังคับ ผู้ใช้ควรคลิกบนภาพได้แทน
การพิมพ์พิกัด และ editor ต้องแสดง marker ของภาพเทียบ marker ของ master พร้อมค่าคลาดเป็น px

ขั้นต่ำของ Outfit Preview / QA:

- import/เลือก `pieces.json` และ texture ชุด แล้ว auto-assemble
- สลับดูทั้งตัวหรือ isolate `torso`, `arm_F`, `arm_B`, `leg`; ให้ `arm_B` มีทางลัดชัดเจน
- overlay full-body ต้นฉบับ, master bones/joints, part pivots และ mesh
- preset ตรวจ standing, drawn pose, elbow 90°, arms forward/raised, crouch และ step extremes
- รายงาน required part, transparency, joint mismatch, fist/foot reach, shoulder/hip coverage,
  gap และ deformation warning; รายงานเชิงกลได้แต่ยังให้คนตัดสิน fist view และคุณภาพศิลป์
- lock bone name/parent/length, IK และ clips ในโหมด outfit; การแก้ master ต้องกลับ Rig Setup

ระยะเปลี่ยนผ่านยังให้ builder รวม master + outfit ออกเป็น `.rig.json` เต็มเพื่อไม่ต้องแก้
runtime ทันที แต่เป้าหมายข้อมูลระยะยาวคือ master skeleton/animations กลางหนึ่งชุด กับ
`<name>.outfit.json` ที่เก็บ texture, attachment/pivot/offset, mesh override และ optional parts
เท่านั้น การเพิ่ม clip กลางจึงใช้ได้กับทุก outfit โดยไม่ต้องคัดลอก clip ไปทุกไฟล์

## งานถัดไป: neutral body master สำหรับ Traveler pipeline

ข้อสรุปล่าสุดคือควรสร้าง **neutral body master** อีกชุดหนึ่งเป็นร่างมาตรฐานเรียบ ๆ ใน
ชุดรัดรูปสีเรียบ/หุ่น mannequin ที่อ่านมวลร่างกายได้ชัด ไม่ใช่ตัวละครเปลือยและไม่ใช่ costume
สำเร็จรูป จุดประสงค์คือกำหนด anatomy envelope ที่คงที่ก่อนวาดเสื้อผ้าทับ โดยยังใช้
`hero-c3-B7` skeleton, joints, setup pose, IK และ animation เดิมทั้งหมด งานนี้ยังเป็น
ข้อเสนอที่ต้องสร้างและทดสอบ ไม่ได้เปลี่ยน production master แล้ว

ไฟล์ตั้งต้นที่ควรมีและต้องสัมพันธ์กันเป็นร่างเดียวกัน:

- `body-master-fullbody`
- `body-master-torso`
- `body-master-arm_F`
- `body-master-arm_B`
- `body-master-leg` — texture geometry กลางหนึ่งชิ้น ใช้ซ้ำกับ slot `leg_F` และ `leg_B`
  ได้ เพราะ neutral master ต้องการมวลร่างมาตรฐานเหมือนกันทั้งสองข้าง; bones, pivots และ IK
  ของสองข้างยังแยกกันตามเดิม

สาเหตุที่ต้องทำมาจากผลทดลอง **Traveler pipeline** ปัจจุบัน: สูตรนี้ใช้ production costume
part เดิมเป็น edit target ทีละชิ้น เพราะมันรักษา canvas, pivot, joint reach, มวล และส่วนที่ถูก
ชิ้นอื่นบังได้ดีกว่าการวาด isolated part ใหม่ แต่ production part มีเสื้อผ้าเดิมติดอยู่และ
silhouette แต่ละด้านไม่ใช่ anatomy กลาง เช่น near upper arm ของ dark-gold ถูก AI วาดบางมาก
ขณะที่ far arm มี padded sleeve จนค่าความกว้างดูต่างกันมาก การตั้งเปอร์เซ็นต์ความกว้างตายตัว
หรือสั่ง script ขยายภาพภายหลังจึงแก้ปลายเหตุและเสี่ยงทำลายดีไซน์ชุด

ข้อเสนอเดิมสำหรับทดลอง neutral parts (ยังไม่รับรอง; ไม่เปลี่ยน Traveler อัตโนมัติ):

1. approved full-body เป็น authority ของดีไซน์ สี รายละเอียด และการซ้อนชั้นของชุด
2. matching neutral body part เป็น edit target/geometry scaffold ของแต่ละ call
3. ImageGen วาดเสื้อผ้า **ครอบออกจากร่างมาตรฐาน** โดยคง canvas, pivot, joint reach และ
   anatomy envelope; อนุญาตให้ชุดหนาหรือกว้างออกด้านนอก แต่ห้ามกินเข้ามาจนส่วนร่างหาย
4. สร้างหนึ่ง call ต่อหนึ่งชิ้นตาม Traveler pipeline เดิม: `torso`, `arm_F`, `arm_B`,
   `leg_F`, `leg_B` และ optional parts ที่แยก ownership แล้ว
5. ใช้ script ตรวจว่า alpha ของ outfit ครอบ body-envelope mask ในบริเวณที่ชิ้นนั้นรับผิดชอบ
   พร้อมตรวจ endpoint/joint/sole ตามเดิม ถ้าไม่ครอบให้ fail และสร้างชิ้นใหม่ ห้าม auto-scale
   ความกว้างหรือแก้ skeleton เพื่อให้ผ่าน

neutral body master เป็น **art/geometry scaffold** คนละอย่างกับ master skeleton: มันช่วยให้
AI ไม่ทำแขนหรือขาเล็กกว่าร่าง แต่ไม่ได้เพิ่ม bone, ไม่ได้สร้าง animation ชุดใหม่ และไม่ควร
กลายเป็น texture ที่ผู้เล่นเห็นในช่องว่างโดยอัตโนมัติ ต้องทดสอบอย่างน้อยหลาย silhouette
(เสื้อบาง, เกราะหนา, เสื้อคลุม) ก่อนประกาศแทน production master part เดิม

### ผลทดลอง neutral body master v2 — ตก / เก็บเป็นประวัติ

ผู้ใช้ปัดงานรอบนี้ตกแล้ว รวมถึง `body-scaffold-v1` ที่เป็นหุ่นเวกเตอร์ในรอบถัดมา
ข้อความด้านล่างเป็นผลในอดีต ไม่ใช่ master ที่อนุมัติ ให้ใช้ full-body base ใหม่ที่
`assets/approved/neutral-body-v1/fullbody.png` เป็น authority สำหรับการทดลอง parts ต่อไป
และยังต้องตรวจ skeleton identity เพราะ builder รอบเก่าเปลี่ยนความยาวแขนตามภาพ

งาน review อยู่ที่ `assets/drafts/body-master-v2/` และ rig คือ
`src/data/study-body-master-v2.rig.json` ยังไม่ใช่ production master การ edit full body ตรง ๆ
สองครั้งตก height gate หลัง align (`sole -40 px` และ `-79 px`) จึงเปลี่ยนเป็นสร้าง part บน
production canvas แล้ว fit เข้าจุด skeleton เดิม ภาพล่าสุดใช้แขน/ขาเส้นนอกเรียบ ไม่มีปุ่ม
ข้อศอกหรือเข่า, มือสีผิว และเป็นเท้าเปล่าจริงแทนรองเท้าทาสีผิว สำหรับ neutral master
ให้สอง slot ขาใช้ texture `leg_F.png` เดียวกันเพื่อให้มวลและรูปเท้าเหมือนกัน แต่ยังคง
`leg_F`/`leg_B` bones, pivots, draw order และ IK แยกกัน

ผลเชิงกล: `arm_F` ได้ bone halves `132.4 + 132.4` และ upright lean `3.1°` (ผ่าน warning
limit `5°`); `arm_B` ได้ `133.6 + 133.6` แต่ upright lean `7.0°` จึงผ่าน endpoint แต่ยังต้อง
ตรวจ elbow deformation ก่อนอนุมัติ ขาทั้งสองยังใช้ bone lengths `169 + 129`; ภาพขาร่วมถูก
วางด้วย pivot เดียวกันบนตำแหน่งสะโพกของแต่ละฝั่งและ sole เดิม รายละเอียดและ prompt contract อยู่ใน
`assets/drafts/body-master-v2/README.md` กับ `generation-prompts.md`

แก้ wrist-v2 หลังพบภาพประกอบดูเป็นชิ้นแปะ: แขนทั้งสองมีช่วงข้อมือสีเนื้อสั้น ๆ ระหว่าง
ปลายชุดรัดรูปกับกำปั้น ขอบสีเทาเป็นเส้นโค้งสะอาดแทนเส้นดำหนา และให้ `arm_F` วาดใต้
`torso` เช่นเดียวกับ `arm_B` เพื่อให้ torso ปิดปลายโดม construction ที่หัวไหล่; ไม่ได้ย้าย
shoulder pivot หรือเปลี่ยนความยาวกระดูก ไฟล์ใช้งานอยู่ใน `fitted-wrist-v2/`

### Ownership ของ cape, shoulder cape และ mantle

ภาพ approved full-body ควรมี cape/shoulder cape ครบเพื่อให้ผู้ใช้ตัดสินดีไซน์และ silhouette
ได้ แต่ตอนสร้าง runtime parts ต้องวาด/สร้าง `torso_under` ที่เป็นลำตัวจริง **ใต้ cape** โดย
ไม่มี cape หลอมติดอยู่ แล้วแยกผ้าออกตามหน้าที่ เช่น:

- `cape_back` — อยู่หลังลำตัวและแขน ติด `chest/torso` ได้หากยังไม่ต้องแกว่ง
- `mantle_front` หรือ shoulder-cape front — พาดด้านหน้าไหล่/อก เป็น layer เหนือ `torso_under`
- `cape_front_F` — มีเฉพาะเมื่อชายผ้าต้องบังแขนใกล้; ต้องวางเหนือ `arm_F`

draw order เริ่มต้นที่ควรทดลองคือ `cape_back → arm_B → legs → torso_under →
mantle_front → arm_F → head` แล้วเพิ่ม `cape_front_F` หลัง `arm_F` เมื่อดีไซน์ต้องการ
บังแขนใกล้จริง ๆ การผูกทุกชิ้นกับ torso ก่อนเป็นทางเลือกง่ายสำหรับ cape นิ่ง; ถ้าต้องมี sway
ค่อยเพิ่ม cape bone chain/mesh ภายหลังโดยไม่เปลี่ยน skeleton แขนขา

อย่าสับสนระหว่าง **rounded sleeve/pauldron cap** ที่เป็นรอยต่อของแขนกับ **shoulder cape/
mantle** ที่พาดข้ามไหล่และหลัง: อย่างแรกเป็น ownership ของ torso หรือ arm ตาม construction
contract ที่เลือกและห้ามวาดซ้ำสองชั้น ส่วนอย่างหลังควรเป็น optional layer แยก การ crop จาก
full-body จึงใช้เป็น costume authority เท่านั้น ไม่ใช่คำสั่งให้คัด cape ติดมากับ `torso_under`
หรือให้ตัดแขนตามขอบผ้าที่บังอยู่

## เพิ่มโอกาสให้ AI สร้างภาพผ่านตั้งแต่ครั้งแรก

เป้าหมายไม่ใช่ให้ editor ชดเชยภาพผิด แต่ลดโอกาสเกิดภาพผิดก่อนเข้า rig โดยวัดแยกเป็น
`full-body ผ่านครั้งแรก` และ `แต่ละ runtime part ผ่านครั้งแรก` การสร้าง parts sheet ทั้งชุด
ในภาพเดียวเคยทำให้ geometry ของชิ้นต่าง ๆ drift และไม่ควรนำกลับมาเป็น default โดยไม่มี
การทดลองที่พิสูจน์ว่าดีกว่า one-call-per-part ปัจจุบัน

แยกชื่อ workflow ออกจากสูตรสร้างภาพให้ชัดเจน:

- `Full pipeline` = ลำดับงานครบตั้งแต่ full-body review → parts → placement/assembly → rig → QA
  แต่คำนี้เพียงคำเดียวยังไม่ได้เลือกวิธีสร้าง part
- `Neutral pipeline` = สูตรสร้าง full body จาก neutral ขั้นต่ำ + ref ดีไซน์ พร้อม natural
  clothing ease ตาม `docs/neutral-pipeline.md` ไม่ใช่สูตร neutral runtime parts ที่ผ่านแล้ว
- `Traveler pipeline` = หนึ่ง call ต่อหนึ่งชิ้น โดยใช้ matching production master texture เป็น
  edit target; approved full-body + crop กำหนดดีไซน์/สี/รายละเอียด ส่วน master part กำหนด canvas,
  endpoint, mass และ hidden geometry สูตรนี้ใช้กับ `torso`, `arm_F`, `arm_B`, `leg_F` และรองรับ
  `leg_B` แยกเป็น explicit extension โดยใช้ master leg เดิมเป็น geometry scaffold แต่ใช้ crop
  ฝั่งขาไกลเป็น costume authority ของตัวเอง
- `Fresh reconstruction` = สร้าง isolated transparent part ใหม่ โดยใช้ master เป็น reference
  เท่านั้น เป็นการทดลองอีกแบบหนึ่ง ห้ามสลับมาใช้เองเมื่อผู้ใช้สั่ง Traveler pipeline

คำว่า “เริ่มใหม่”, “fresh full pipeline” หรือ “ไม่ทำ v2” หมายถึงไม่เอา generated part ที่ตก
มาแก้ต่อ ไม่ได้เลือก Fresh reconstruction และไม่ได้สั่งให้ทิ้ง master scaffold

การทดสอบ Traveler pipeline รอบถัดไปให้ควบคุมตัวแปรดังนี้:

1. เลือก costume เดียวและล็อก approved full-body; ห้ามให้รอบ part redesign ชุด
2. สร้าง prompt template แยก `torso`, `arm_F`, `arm_B`, `leg` โดยเริ่มจาก matching master
   part เป็น edit target ระบุเฉพาะพื้นที่ซ่อนที่ต้องเติม และย้ำว่าห้ามคัดลอก costume ของ master
3. ใช้ reference contract เดิมทุกครั้ง: master part = rig construction, approved full-body =
   costume authority, crop สะอาด = visible detail, construction/fist reference = view/ownership
4. สร้างชิ้นละหนึ่งครั้งก่อน แล้วให้ pipeline + Outfit Preview ทำ automatic measurements
   และ preset renders; บันทึก failure reason เป็นหมวด ไม่สรุปจากความรู้สึก
5. แก้ prompt/reference เฉพาะสาเหตุที่เกิดซ้ำ เช่น hidden upper arm, far-fist view,
   leg dome หรือ ownership ของ hood/pauldron แล้วทดสอบกับอย่างน้อยสาม costume ที่รูปทรงต่างกัน
6. ถือว่า one-pass ดีขึ้นเมื่อชิ้นผ่านทั้ง geometry และ renderer โดยไม่ต้อง edit/regenerate;
   ความตรงของ placement เพียงอย่างเดียวไม่ถือว่าผ่าน

ผลที่ต้องการจากงานนี้คือ prompt/reference recipe ที่ทำซ้ำได้ พร้อม failure log และ proof
renders ไม่ใช่คำรับรองว่า AI จะผ่านครั้งแรกทุกภาพ ซึ่งยังรับประกันไม่ได้

### ผลทดลองควบคุม 2026-10-19

ทดลองซ่อม `arm_B` ของ Traveler เก่าซึ่งเดิมสร้างจาก crop + full-body แล้วช่วงต้นแขนไกล
สั้น/บาง โดยเพิ่ม `master-arm_B` เป็น geometry-only reference และสร้างเฉพาะแขนหนึ่งชิ้น
ในหนึ่ง ImageGen call ผลใหม่มี silhouette ต่อเนื่องจาก shoulder ถึง fist และ automatic fit
ทำงานได้โดยไม่ต้องให้ผู้ใช้คลิก joint เอง สัดส่วนความกว้างแขนไกลเทียบแขนใกล้ดีขึ้นจาก
upper arm `57% -> 73%`, forearm `72% -> 77%`, wrist `70% -> 70%`, fist
`77% -> 82%`; การเข้าหา standard skeleton ต้องแก้แบบ deterministic เพียง scale
`0.9271` และ rotation `+14.64°` แทนชุดเก่าที่ประเมินว่าต้องขยายประมาณ `1.32` เท่า

ลองอีกแบบโดยใช้ master arm เป็น edit target และสั่ง geometry lock พบว่า ImageGen ยัง redraw
ทรง master อยู่ดี และค่าที่ได้แทบไม่ดีกว่า (scale `0.9285`, rotation `+14.23°`) จึงไม่ควร
อ้างว่าเป็น pixel-exact lock สูตรตั้งต้นที่แนะนำคือหนึ่ง call สร้างหนึ่ง transparent part พร้อม
reference contract ที่กำหนดหน้าที่ภาพชัดเจน: approved full-body = design/color, crop = visible
detail, matching master part = length/mass/hidden geometry only, construction reference =
fist/limb view, style reference = linework และย้ำห้ามคัดลอก costume จาก master

ผู้ใช้ตรวจรับ `traveler-arm_B-geometry-lock-v1.png` เป็น **PASS** สำหรับ one-call generation:
ระยะ shoulder-to-fist ก่อน auto-fit `287.8 px` เทียบ master reference `288.4 px` (`-0.2%`)
และวางบน standard skeleton ได้สำเร็จ ความกว้าง forearm/wrist/fist ที่เล็กกว่า master ยอมรับได้
ในฐานะ silhouette ของ sleeve/glove ประจำ outfit; ความกว้างชิ้นภาพไม่ใช่เหตุให้ตกตราบใดที่
joint reach ถูก ภาพไม่ขาด และ deformation ใช้งานได้

ผลและไฟล์เปรียบเทียบอยู่ใน `assets/drafts/one-pass-study-v1/README.md` การทดลองนี้พิสูจน์ว่า
แก้ failure แบบแขนไกลไม่ครบได้ตั้งแต่ generation call แรกของชิ้นนั้น แต่ยังไม่ถือเป็น production
pass จนกว่าจะผ่าน pose/bend/deformation QA ใน renderer จริง ขั้นถัดไปที่ควรทดลองคือ hybrid
compositing: คง visible pixels จาก approved full-body ไว้ แล้วให้ AI เติมเฉพาะ hidden continuation
ก่อนประกบ visible layer เดิมทับ เพื่อป้องกัน detail drift

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
