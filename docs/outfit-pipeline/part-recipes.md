# สูตรรายชิ้นจาก Time Travel — ใช้ก่อนเขียน prompt ชุดใหม่

เอกสารนี้เสริม [มาตรฐานกลาง](standard.md) โดยแยก **วิธีที่ใช้จริง** ออกจากกติกาทรง
และจากวิธีที่ยังทดลอง ผล Time Travel ไม่ได้เกิดจากสูตรเดียวกันทุก part
การมี Neutral กับ full body อยู่ใน refs เหมือนกัน ไม่ได้แปลว่าใช้วิธีเดียวกัน

## 1. แขน F/B: Neutral edit target + costume + technical master

**นี่คือสูตรตั้งต้นที่ต้องใช้สำหรับแขนชุดใหม่** เว้นแต่ผู้ใช้ตกลงให้ทดลองวิธีอื่น
ห้ามเปลี่ยนเป็นวาดแขนใหม่จาก reference เฉยๆ หรือบังคับแขนเป็นแนวตั้งก่อนเจนโดยไม่แจ้ง

### หลักฐานและหน้าที่ภาพ

| ภาพ | หน้าที่ | ไฟล์ที่เก็บไว้ |
|---|---|---|
| 1 | **Neutral arm เป็น edit target** ให้สวม/วาดชุดทับ anatomy เดิม คงท่า ความยาว ความสัมพันธ์ไหล่–ศอก–ข้อมือ และมุมมือ | [F](../../assets/pipeline/examples/time-travel/arm-f-neutral-edit-target.png), [B](../../assets/pipeline/examples/time-travel/arm-b-neutral-edit-target.png) |
| 2 | approved full body กำหนดดีไซน์ วัสดุ ปริมาตร และขนาดถุงมือ | [Time Travel full body](../../assets/approved/time-travel-neutral-ease-v1/fullbody.png) |
| 3 | matching master arm เป็น **technical reference เท่านั้น** ช่วยคุม reach และไหล่ที่ซ่อนอยู่ ห้ามคัดลอกชุด/สี | [master F](../../assets/rigs/shared-master/arm-f.png), [master B](../../assets/rigs/shared-master/arm-b.png) |

ภาพ Neutral ที่ลิงก์คือ **raw edit target จริงในรอบ Time Travel** ไม่ใช่ runtime PNG
ที่ผ่าน fit/หมุน/ปรับสีแล้ว รูปเหล่านี้เป็นหลักฐานของวิธี ไม่ใช่ geometry authority แทน skeleton ปัจจุบัน
master paths ใน prompt เก่าถูกย้ายแล้ว ให้ใช้ลิงก์ปัจจุบันในตารางแทนชื่อ hero-c3 เก่า

### ขั้นตอนที่ต้องทำ

1. อ่านและดู prompt/ภาพทั้งสามบทบาทก่อนเริ่ม: [prompt F จริง](../../assets/pipeline/examples/time-travel/arm-f.prompt.txt), [prompt B จริง](../../assets/pipeline/examples/time-travel/arm-b.prompt.txt)
2. ใช้ Neutral ฝั่งตรงกันเป็น **ภาพที่ถูกแก้** ไม่ใช่แค่แนบเป็น inspiration
   คงท่าเฉียงที่วาดมา ไม่เปลี่ยน pose เพื่อให้สะดวก fit และไม่ใช้ upright runtime แทนอย่างเงียบๆ
3. เปลี่ยนเฉพาะข้อความดีไซน์ชุด/วัสดุ/รายละเอียดที่จำเป็น ให้ตรง approved full body ชุดใหม่
   เสื้อผ้ามีความหนาและ ease ได้ แต่ไม่ยืด anatomy ไม่เพิ่มชั้นเกราะหรือลวดลายเอง
4. F และ B คนละ call เริ่มจากต้นแบบที่นิ่ง ไม่ mirror และไม่ใช้แขน reject ต่อเป็นฐาน
   F เห็นหลังมือ; B เห็นนิ้วกำสามนิ้วกับนิ้วโป้งพาดหน้า มือรวม 3 นิ้ว + 1 โป้ง
5. วาดส่วนไหล่ที่ซ่อนให้ครบเป็นเนื้อเดียวกับ sleeve/pauldron ไม่มีบอลหรือ connector เพิ่ม
   ส่วนที่ขยับไปกับแขนเป็นของ arm; ไม่ลากชิ้นหน้าอก/torso ติดไปด้วย
6. ตรวจ artwork ก่อน fit จาก landmarks จริง ไม่ใช้ยอดหนามเกราะหรือขอบนอกถุงมือแทน joint
   fit/หมุนภาพและผูก attachment ภายหลังโดย **ไม่เปลี่ยน bones หรือ animation กลาง**
7. ประกอบและทดสอบไหล่/ศอก/มือ รวมทั้งรอยต่อกับ torso; คำว่า one shot ไม่ได้แปลว่าผ่าน QA แล้ว

Time Travel รุ่นแรกเคยมีการ fit bones ตาม artwork ก่อนย้ายมาใช้ fixed skeleton
อย่าทำขั้นตอนประวัตินั้นซ้ำ ตอนนี้ผล artwork ต้องเข้ากับ skeleton ที่ล็อกแล้วเท่านั้น

### กรณีผิดวิธีที่ต้องไม่ทำซ้ำ

แขนชุดเกราะรอบ 2026-10-23 ใช้ upright Neutral เป็น anatomy reference + full body
แล้วสั่งวาดใหม่ ไม่มี technical master และเปลี่ยน pose ใน prompt จึง **ไม่ใช่สูตรข้างบน**
ผลดูยาว เกราะแน่นและเพิ่มดีไซน์เกิน full body ถือเป็น draft ไม่ใช่ตัวอย่างที่ผ่าน
หากจะเปลี่ยนบทบาทภาพ/pose/recipe ให้บอกเหตุผลและขอความเห็นก่อนเจน

## 2. Torso: กติกาทรงผ่านแล้ว แต่ไม่มี one-shot recipe ที่พิสูจน์ข้ามชุด

**อย่าสรุปว่า torso ใช้สูตรแขน หรือว่า Time Travel torso ผ่านจาก one shot เดียว**
ผลที่เลือกมาจาก fresh reconstruction แล้วแก้เฉพาะจุดสองรอบ:

| รอบจริง | Inputs และวิธี | Prompt / ผล raw |
|---|---|---|
| เริ่มใหม่ | Time Travel torso เดิมเป็น design/body-mass/style ref; master torso เป็น construction ref; **ทั้งสองไม่ใช่ edit target** | [prompt](../../assets/pipeline/examples/time-travel/torso-initial.prompt.txt), [ผล](../../assets/pipeline/examples/time-travel/torso-initial-source.png) |
| ตัด B + ลดขอบ F | edit ผลรอบแรก + master construction + คำแนะนำขอบ B ของผู้ใช้ | [prompt](../../assets/pipeline/examples/time-travel/torso-trim.prompt.txt), [ผล](../../assets/pipeline/examples/time-travel/torso-trim-source.png) |
| ทำ F เรียบ | edit รอบสอง เอาขอบทอง/วงหนาซ้อนออก คง B ที่ตัดแล้ว | [prompt](../../assets/pipeline/examples/time-travel/torso-simplify.prompt.txt), [ผลที่เลือก](../../assets/pipeline/examples/time-travel/torso-selected-source.png) |

แหล่ง design input รอบแรก: [torso ก่อนแก้](../../assets/pipeline/examples/time-travel/torso-design-reference.png)
และ [master construction](../../assets/rigs/shared-master/torso.png)
ผลใช้งานหลัง fit/สี: [Time Travel torso](../../assets/rigs/time-travel/torso.png)
คำแนะนำขอบ B ใน prompt รอบสองมีภาพ markup ประวัติ ไม่ได้เก็บ bitmap นั้นใน bundle นี้
จึงเก็บ prompt/ผลเพื่ออธิบายลำดับจริง ไม่อ้างว่าทำซ้ำทุก input ได้ครบหรือรับประกันผลเดิม

สำหรับชุดใหม่: ใช้ Neutral torso ที่รับแล้วกำหนด anatomy, approved full body กำหนดชุด
และ torso ที่ผ่านเป็นตัวอย่าง construction รับแขน ระบุบทบาทแต่ละภาพให้ชัดก่อน call
นี่เป็น **แนวทางเริ่มทดลอง** ไม่ใช่สูตร one-shot ที่ผ่าน cross-outfit proof แล้ว
อย่านำ torso ชุดเก่ามาเป็น costume authority ของชุดใหม่

เกณฑ์ที่ต้องคง: F มีเนื้อ torso และรายละเอียดชุดครบใต้แขน แต่ไม่เป็น sleeve/wing ซ้ำ;
B เรียบไม่มี connector; คอซ้อนใต้หัว; ชายหน้าปิดชายหลังทั้งกลางและสองข้าง
การใช้ Time Travel คุมขอบรับแขนของชุดใหม่ถือเป็น geometry/construction ref ไม่ใช่เปลี่ยน skeleton
Torso ชุดเกราะ v6/v7 ยังเป็น candidate ต่าง construction กัน ต้องลองประกอบก่อนเลือก
ห้ามยกระดับสองตัวนี้เป็น recipe ที่ผ่านแล้วจากภาพเดี่ยว

### แนวทาง torso เพิ่มเติมจากชุดเกราะ v6/v7 — รอเทสประกอบ

นี่คือ **แนวทาง construction** ที่ต้องเก็บไว้ ไม่ใช่คำสั่งให้ทำซ้ำลำดับแก้ภาพ
v4 → v5 → v6 → v7 และไม่ใช่การรับรอง one-shot recipe ใหม่

**ฝั่ง B / ขวาภาพ:** ไม่ต้องมีส่วนรับ arm_B ยื่นออกจาก torso เลย
ตัดปุ่ม แท็บ แผ่นหัวไหล่หรือวงเชื่อมออก ให้ขอบด้านข้างลำตัวเรียบ/กระชับ
แต่ยังวาดเนื้อ torso ที่ซ้อนปิดรากแขนให้ครบตาม draw order (arm_B อยู่หลัง torso)
คำว่าไม่มีจุดรับ B ไม่ได้แปลว่าเว้นรูหรือเอาเนื้อหน้าอก/ด้านข้างที่จำเป็นออก

**ฝั่ง F / ซ้ายภาพ:** มีสองแนวทางให้เปรียบเทียบ ยังไม่เลือกเป็นมาตรฐานสุดท้าย

| แนวทาง | รูปทรงที่ต้องการ | สิ่งที่ต้องตรวจตอนประกอบ |
|---|---|---|
| แบบ v6 — ขอบเว้าเข้า | ขอบรับแขนโค้งเว้าเข้า มีรายละเอียดเกราะ/รอยต่อ/เงาของ torso ต่อเนื่องใต้แขน ไม่ใช่พื้นดำว่าง | ขอบไม่อ่านเป็นวง socket หรือแขนเสื้อซ้ำ และไม่เปิดรูตอนยกแขน |
| แบบ v7 — แผ่นลาดรับใต้แขน | แผ่นเกราะ torso กว้างขึ้นเล็กน้อย ลาดจากข้างคอลงด้านข้าง มี seam โค้งด้านใน เป็นเนื้อ torso ใต้แขน | แขนบังแผ่นนี้ได้พอดี ไม่โผล่เป็นปีกหรือหัวไหล่แข็งซ้ำเมื่อแขนขยับ |

ทั้งสองแบบต้องเติมดีไซน์ชุดในบริเวณที่ full body ถูกแขนบังด้วย
เกราะหัวไหล่/sleeve ที่ขยับยังเป็นของ arm_F ไม่ใช่ของแผ่น torso นี้
ก่อนเลือกให้ใช้แขนและ skeleton เดียวกันเทียบ setup, ยก/กางไหล่, งอศอก และเอียงลำตัว
ห้ามเลื่อน bones เพื่อช่วยให้แนวทางใดแนวทางหนึ่งดูผ่าน

**ชายเสื้อ/แผ่นเกราะเอว:** ชายชั้นหน้าต้องต่ำกว่าและปิดชายชั้นหลังตลอดช่วงซ้อน
รวมทั้งขอบล่างสองข้าง ไม่ใช่แค่ปลายกลางยาวที่สุดแล้วปล่อยชายหลังแหลมๆ โผล่ข้าง
ให้ตัดสั้น/ซ่อนแผ่นหลังที่โผล่ ไม่เพิ่มความยาวชั้นหน้าจนลงมารบกวนเข่าหรือข้อต่อสะโพก
ลายแผ่นเกราะซ้อนภายในชั้นหน้ายังมีได้ ไม่ได้สั่งให้ชายเสื้อกลายเป็นเส้นตรงหรือไม่มีลาย
ต้องวาดพื้นที่ซ้อนกับโดมสะโพกให้ครบ และเทสกับขาจริงตอนยกขา/ย่อตัวด้วย

## 3. Leg: F ใช้ silhouette guide; B ใช้ F ที่เลือก + ดีไซน์ฝั่ง B

ส่วนนี้มี [prompt F](../../assets/pipeline/examples/time-travel/leg-f.prompt.txt)
และ [prompt B](../../assets/pipeline/examples/time-travel/leg-b.prompt.txt) เก็บไว้ก่อนแล้ว
**เป็น fresh reconstruction จาก refs ไม่ใช่ edit ทับ Neutral แบบแขน**

### leg_F — หนึ่ง call จาก refs ที่นิ่ง

1. technical garment-envelope guide คุม contour เสื้อผ้า โดมสะโพก bend zones และพื้น
2. approved lower crop ฝั่ง F คุมทรงกางเกง/รองเท้า วัสดุ สายคาดและ buckle
3. Neutral leg คุม anatomy ความยาว ท่า และระดับพื้น ไม่ใช่ขอบเสื้อผ้ารัดรูป
4. approved full body คุมภาพรวมชุด สีและ rendering

ผลที่เลือก: [leg_F source](../../assets/pipeline/examples/time-travel/leg-f-source.png)
guide ตัวอย่างอยู่ [v1](../../assets/pipeline/guides/leg-envelope-v1/README.md)
และ [v2](../../assets/pipeline/guides/leg-envelope-v2/README.md)
prompt เก่าพูดถึงเส้นสีหลายระดับ; ก่อนเจนใหม่ต้องเลือก contour เป้าหมายเดียวให้ชัด
และอัปเดต landmarks ตาม knee 52%/ตาตุ่ม/skeleton ปัจจุบัน ห้ามเปลี่ยน joint ตาม guide เก่า

### leg_B — รอเลือก F ก่อน ไม่เจนคู่แบบเดาหรือกลับด้าน

1. accepted leg_F เป็น ref ความสูง ปริมาตร โดม ความหนารองเท้า และ finish
2. approved crop ฝั่ง B เป็น design/perspective authority ของขาและรองเท้าฝั่งไกล
3. approved full body กำหนด family ของชุด
4. Neutral leg คุม anatomy/pose/floor
5. style-only ref ถ้าจำเป็น ตามบทบาทใน prompt จริง ห้ามคัดลอกตัวละครจาก style ref

ผลที่เลือก: [leg_B source](../../assets/pipeline/examples/time-travel/leg-b-source.png)
crop ต้องไม่มีอีกข้างติดมา ห้าม mirror F และห้ามบังคับมุมรองเท้าตามท่ายืน full body
จนขัดกับ motion-ready Neutral; ใช้มุมรองเท้า F/B ที่เข้ากันและวาดฝั่ง B แยก

หลักการ guide ใช้กลางได้ แต่ contour เปลี่ยนตามชนิด/ดีไซน์ชุด
คำว่า relaxed cloth/folds ในตัวอย่าง Time Travel ไม่ใช่คำสั่งให้ชุดเกราะทุกชุดเป็นกางเกงผ้า
ชุดใหม่ที่ contour ต่างกันต้องปรับ guide ก่อน ไม่ใช้สูตรเพิ่มความกว้างตายตัว

## 4. Preflight ที่ต้องบันทึกก่อนทุก call

- part/side, recipe ชื่อไหน, generate หรือ edit, input แต่ละภาพมีหน้าที่อะไร
- exact edit target (ถ้ามี), approved design source, anatomy/guide/technical source
- pose และ geometry ที่คงเดิม; ส่วนที่อนุญาตให้เปลี่ยน; ห้ามเปลี่ยน skeleton
- prompt ที่ใช้จริง, output/version, deviations และสถานะ raw/fit/renderer QA
- ถ้า refs ที่สูตรต้องใช้หาย ห้ามละทิ้งเงียบๆ ให้หา input หรือแจ้งก่อนเปลี่ยนวิธี

Prompt เก่าเป็นกรณีศึกษาพร้อมภาพ ไม่ใช่สูตรสำเร็จคัดลอกข้อความอย่างเดียว
กติกา fit, สี, alpha และ pose QA ให้อ่าน [standard](standard.md) และ [tooling](tooling.md)
