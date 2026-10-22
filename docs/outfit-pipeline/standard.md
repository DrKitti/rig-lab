# Kolahon Outfit Pipeline — ชุดใหม่บนโครงเดียว

ชื่อ pipeline ภาพรวมตั้งแต่ full body → parts → fit → สี → rig QA คือ **Kolahon Outfit Pipeline**
ชื่อเดิม **Neutral pipeline** ยังใช้อ้างถึง recipe ตอนเจน full body บน Neutral ได้ในประวัติงาน
แต่ไม่ใช่ชื่อครอบทุกขั้นตอน ส่วน Traveler pipeline เป็นอีก part-generation recipe ที่แยกหน้าที่ไว้

Checkpoint: 2026-10-22

[Infographic ภาพรวม](figures/pipeline-overview.png)
เป็นภาพสื่อสารขั้นตอน; รูปตัวละคร/turnaround ในภาพเป็นภาพประกอบ ไม่ใช่ asset ต้นแบบหรือข้อกำหนด
ว่าต้องเจนหลายมุมใน workflow ปัจจุบัน ให้ยึด pose, parts และพิกัดจริงตามเอกสารนี้

เอกสารนี้รวบข้อสรุปล่าสุดจากการทำ Neutral และ Time Travel เพื่อใช้ทำชุดถัดไป
ตัวเลข geometry ให้อ่านจากไฟล์ spec และ rig หลักเสมอ ส่วนหัวข้อประวัติในเอกสารเก่า
หรือ prompt ที่เคยใช้ อาจมีตำแหน่งเข่า/แขนรุ่นก่อนหน้า

สถานะ: skeleton กลาง, Neutral parts และทรง Time Travel ผ่านการเลือกแล้ว
สี Time Travel ใช้ pass แยกวัสดุครบทั้งห้า part ในรอบนี้
ยังต้องพิสูจน์ pipeline ด้วย **อีกหนึ่งชุด ตั้งแต่ full body จนประกอบ โดยไม่เปลี่ยน skeleton**
ก่อนถือว่ามาตรฐานทั้งหมดใช้ข้ามชุดได้จริงและจัด assets เข้า production ถาวร

## 1. อะไรเป็นตัวกำหนดอะไร

| สิ่งอ้างอิง | หน้าที่ |
|---|---|
| Skeleton `neutral-c-v5` | ตำแหน่งข้อต่อ ความยาว limb จุดหมุน และ animation ที่ใช้ร่วมกัน |
| Neutral full body | ร่างกายและท่าข้างในชุด ใช้เป็น edit target ตอนเจน full body |
| Neutral part ของชิ้นนั้น | anatomy ที่ซ่อนอยู่ ตำแหน่งวาง และพื้นที่ต่อชิ้น |
| Full body ชุดที่อนุมัติ | ดีไซน์ เสื้อผ้า ปริมาตร รายละเอียด วัสดุ และมุมของชุด |
| Garment silhouette guide | ขอบนอก/ความพองที่ต้องการของเสื้อผ้าชิ้นนั้น |
| Style reference (ถ้าแนบ) | เส้น เงา และ texture เท่านั้น |
| Palette/material reference | สีร่วมกันของวัสดุแต่ละชนิดทั่วทั้งชุด |

Neutral คือร่างกายข้างใน เสื้อผ้ามีความหนาและความหลวมออกมาได้
อย่าทำให้กางเกงหรือแขนเสื้อรัดตามทุกเว้าของ neutral และอย่าขยาย anatomy เพื่อให้ชุดพอง
ความกว้างชุดต่างกันได้ แต่ความยาวแขนขาและตำแหน่งข้อต่อต้องใช้ค่ากลาง

## 2. Skeleton และจุดอ้างอิงที่ล็อกแล้ว

แหล่งจริง:

- Master: `src/data/shared-master.rig.json`
- ค่า torso/leg/foot: `docs/rig-spec/shared-skeleton-v5.json`
- กระดูกแขนและ artwork anchor: `docs/rig-spec/shared-arm-placement.json`
- Neutral ที่ดูใน Rig Lab: `src/data/neutral.rig.json`; Time Travel: `src/data/time-travel.rig.json`
  URL ชื่อเก่ายังเปิดผ่าน alias ได้ ส่วน archived trial ไม่ใช่ rig ที่ดูแล

ใช้หนึ่ง skeleton สำหรับทุกชุด F คือฝั่งใกล้กล้อง/ซ้ายภาพใน Setup ส่วน B คือฝั่งไกล/ขวาภาพ
ต้นแขน–ศอก–จุดกลางมือ และสะโพก–เข่า–ตาตุ่ม เป็น landmarks ที่ต้องอ้างอิง
ปลายนิ้ว ขอบถุงมือ ปลายเสื้อ หรือปลายรองเท้าไม่ใช่ตัวกำหนดความยาว bone

พิกัดตารางนี้เป็น **full-body frame เดิม 671×1164**: origin rig อยู่ที่ (359.2, 888),
1 หน่วย rig เท่ากับ 1 px ใน frame นี้ ถ้า ref ถูก pad/resize ต้องแปลง frame ก่อน
พิกัดเหล่านี้ไม่ใช่พิกัดตรงๆ ใน PNG raw 1024×1536 หรือพิกัดหน้าจอ Rig Lab

| จุด | F (x, y) | B (x, y) |
|---|---|---|
| ต้นแขน/bone origin | (265, 580) | (443.665, 585.995) |
| ศอก | (214.001, 691.021) | (494.241, 678.033) |
| จุดกลางมือ/ปลาย forearm bone | (155.996, 814.055) | (582.237, 789.026) |
| สะโพก | (306, 781) | (427, 781) |
| เข่า | (306, 935.96) | (427, 935.96) |
| ตาตุ่ม | (306, 1079) | (427, 1079) |
| พื้น | y = 1119 | y = 1119 |

จุดคอ/head origin อยู่ (340, 490); เอว/จุดแบ่ง torso–chest อยู่ (359.2, 671)
ลำตัวสองท่อนยาว 110 และ 181; root อยู่ระดับสะโพก world y = -107

**arm_B artwork anchor แยกจาก bone origin**:
ตำแหน่งภาพที่ผู้ใช้เลื่อนขวา 12.195 / ขึ้น 6.002 ถูกล็อกไว้ที่ (447.195, 553.998)
ใน full-body frame ส่วน bone เริ่มที่จุดกลางต้นแขนตามตารางด้านบน
ต้องคำนวณ attachment offset ของภาพ ไม่ snap ภาพให้เริ่มตรงต้น bone สีฟ้า
ห้ามบวก offset +12.2/-6 ซ้ำทุกครั้งที่ประกอบ

เข่า 52% หมายถึงต้นขายาว 154.96 จากระยะสะโพกถึงตาตุ่มรวม 298; หน้าแข้งยาว 143.04
เท้าเริ่มที่ตาตุ่ม bone ชี้แนวนอนไปทางปลายเท้า ยาว 75; ตาตุ่มสูงจากพื้น 40
Foot plant รองรับติดพื้น/ลอย และเลือกอัตโนมัติได้
Foot load ยุบสูงสุด 4% ระหว่างรับน้ำหนัก ถึงค่าสูงสุดเมื่อขาหด 20%; ยืนปกติหรือลอยไม่ยุบ
ถอด boot rigid rise แล้ว ช่วงแข็งของเท้าจบที่ตาตุ่ม

Mesh เป็นค่าผูกกับ artwork: แขนปัจจุบัน 16×64 / blend ศอก 40; เข่า blend 8;
torso blend 30; ankle ปัจจุบัน master/Neutral 56 และ Time Travel 80
ค่า blend ปรับตามผล deformation ของชุดได้ โดยไม่เปลี่ยนตำแหน่งข้อต่อ

Animation อยู่ใน `src/data/animations/neutral-c-v5.animations.json`
ทำ/แก้/ลบจากชุดที่ผูกคลังแล้วกดเซฟ มีผลกับทุกชุดในคลังเดียวกัน
Setup/texture/attachment ยังแยกตามชุด ชุดใหม่ที่สร้างจาก master สืบทอด library link

## 3. การแยก part และพื้นที่ซ้อนรอยต่อ

ชุดปัจจุบันมี torso, arm_F, arm_B, leg_F, leg_B; head เป็นของตัวละคร
แขนหนึ่งข้างเป็นชิ้นเดียวตั้งแต่ต้นแขนถึงมือ ขาหนึ่งข้างเป็นชิ้นเดียวจาก hip dome ถึงพื้น
ศอก/เข่างอด้วย mesh ไม่ต้องวาดแยกเป็นท่อนแข็ง

Neutral ใช้ขาต้นแบบเดียวในสอง slot ได้ แต่ชุดจริงให้วาด F/B แยกตามมุมที่เห็น
แขน F/B ต้องเป็นคนละภาพเพราะด้านมือและ perspective ต่างกัน ไม่ mirror หรือ scale แทน
มือมี 3 นิ้วกับนิ้วโป้ง; เท้าเปล่า Neutral มี 4 นิ้วรวมทั้งหมด
มุมเท้าปัจจุบันหันขวาแบบ 3/4 เล็กน้อย ไม่บังคับตามมุมยืนกางเท้าใน full body ทุกพิกเซล

| รอยต่อ | เจ้าของส่วนที่เห็น/การซ้อน |
|---|---|
| คอ–หน้า | torso มี neck stub ต่อใต้ head; ให้ head บังขอบบน |
| ไหล่ F | แขน F อยู่หน้าลำตัว และเป็นเจ้าของ sleeve/cap ที่เคลื่อน |
| ไหล่ B | แขน B อยู่หลังลำตัว; torso บังรากแขนได้ |
| สะโพก | ขามี rounded hip dome เต็ม; ชายเสื้อ/tasset บังส่วนบน |
| ข้อมือ/ข้อเท้า | แขน/ขาชิ้นเดียวต่อเนื่อง; cuff เป็น artwork บนชิ้นนั้น |

วาดพื้นที่ที่มองไม่เห็นต่อให้ครบ ห้ามตัด part ตามส่วนที่เห็นใน full body อย่างเดียว
ต้องมีเนื้อภาพซ้อนพอให้ยก/หมุนแล้วไม่เกิดรู แต่ยังไม่มีระยะซ้อนเป็นจำนวน px เดียวที่รับรองทุกชุด
กำหนดจาก geometry และทดสอบใน renderer ตามชุดจริง ไม่ใช้เลขระยะซ้อนที่เดาเอาเป็นมาตรฐาน

**Torso รับแขน**: ใช้ทรง Neutral torso v4 ที่ผ่านแล้วเป็นฐาน
ฝั่ง F ให้เป็นขอบรับแขนที่ต่อเนื่อง ไม่มีปีกหรือ flap ที่เห็นเป็นแขนเสื้ออีกชั้น
เก็บเนื้อ shirt ที่ซ่อนอยู่ใต้ arm_F ได้ แต่ไม่เพิ่มเส้นปิดรูปใบไม้/ช่อง socket รอบไหล่
ฝั่ง B ให้ด้านข้างเรียบตามทรงเสื้อ ไม่ต้องมีปุ่ม/แท็บเชื่อม arm_B แยกออกมา
ไม่ทำ shoulder disc, ball, ring หรือ connector sprite เพื่อกลบรอยต่อ
สำหรับ sleeve/pauldron ให้เก็บ contour เดิมรอบ pivot เป็นโค้ง ไม่เพิ่มโดมอีกลูกเหนือแขน
คอที่เจนมาไม่จำเป็นต้องวาดใหม่เพียงเพราะไม่สวยตอนซูม; ตรวจการซ้อนและสีที่เข้ากับหน้า

Draw order ฐานจากหลังมาหน้า: arm_B → leg_B → leg_F → torso → head → arm_F
cape/ผ้าที่ต้องบังแขน F ต้องออกแบบ layer เพิ่ม การใส่ไว้ใน torso ไม่ทำให้บังแขน F อัตโนมัติ
accessory layers ยังเป็นงานทดลองถัดไป ไม่เพิ่ม bones เพื่อแก้ทุกชุดโดยอัตโนมัติ

## 4. Garment silhouette guide

หลักการทำ guide ใช้ร่วมกันได้: skeleton landmarks + neutral anatomy + contour เสื้อผ้า
แต่ contour ไม่จำเป็นต้องเหมือนกันทุกชุด กางเกงรัด กางเกงผ้าหลวม และเกราะต้องใช้ envelope ต่างกัน
ใช้ guide เดิมซ้ำได้เมื่อประเภทเสื้อผ้าและทรงที่ต้องการตรงกัน โดยตรวจชุดใหม่ก่อน

Time Travel ทดสอบแนวทาง guide จนได้ขาที่ผู้ใช้เลือกแล้ว
ตัวอย่างอยู่ `assets/pipeline/guides/leg-envelope-v1/` และ `leg-envelope-v2/`
prompt ของ candidate ที่ผ่านอยู่ `assets/pipeline/examples/time-travel/`
guide/prompt เก่าทำก่อนย้ายเข่าเป็น 52%; รอบใหม่ต้องอัปเดต landmarks ใน guide เป็น v5
guide เป็นภาพก่อสร้าง ไม่ใช่ runtime asset หรือข้ออ้างให้เปลี่ยน bone ตามรูปเก่า

สำหรับกางเกงผ้า relaxed แบบ Time Travel:

- ใช้ contour เป้าหมายที่ชัดเพียงเส้นเดียว ตัวอย่างหลายระดับใช้ตอนออกแบบ ไม่ควรให้ AI เลือกเอง
- ส่วนบนเป็นโดมโค้งเต็มที่ต่อกับขา ไม่มีฝา ลูกบอลแยก waistband หรือท่อนเชื่อมเพิ่ม
- ความพองต่อเนื่องจากต้นขาผ่านเข่า แล้วค่อย taper ลงข้อเท้า
- มีจุดเปลี่ยนทิศเบาๆ ตาม setup ได้ แต่ไม่สะสมรอยเว้า ก้อนน่อง หรือทรงซิกแซก
- ให้ความเป็นผ้ามาจาก fold/shadow ภายใน ไม่ใช้ก้อนนูนบนขอบนอกทุกจุด
- รองเท้าให้ได้มุม มวล และระดับพื้นจาก refs โดยมีพื้นที่สำหรับความหนาของรองเท้าเหนือเท้า

## 5. Prompt และการแนบ refs

Full body ใช้ **Neutral pipeline**: ให้เจนแบบสวม/วาดชุดทับ accepted neutral full body
คง anatomy และ pose; ผ้าพองออกมาตามดีไซน์ได้ ไม่ใช้ neutral เป็นเส้นขอบชุดรัดรูป
part แต่ละชิ้นใช้ neutral part/technical scaffold ของชิ้นนั้นกับ approved outfit/crop
ระบุเสมอว่าเป็น edit target หรือ construction reference เพื่อไม่ให้โมเดลสลับหน้าที่ refs
ชื่อ `Traveler pipeline` ในเอกสารเก่าหมายถึง edit บน master costume part โดยเฉพาะ
อย่าใช้ชื่อนั้นแทน neutral-based reconstruction โดยไม่บอกว่าเปลี่ยน recipe

ตัวอย่างชุด refs ต่อ part (ปรับตามความจำเป็น ไม่แนบทุกอย่างเสมอ):

| Ref | หน้าที่ |
|---|---|
| 1: neutral part หรือ guide ของชิ้นนั้น | anatomy/ตำแหน่ง หรือ contour เป้าหมาย ตามที่ระบุ |
| 2: clean crop ฝั่งที่ถูกต้องของ approved outfit | รายละเอียด part และวัสดุ; ไม่ติดแขน/ขาอีกฝั่ง |
| 3: approved outfit full body | ความสัมพันธ์ทั้งชุดและดีไซน์ |
| 4: anatomy part ถ้า ref 1 เป็น guide | anatomy ที่อยู่ข้างใน contour |
| 5: style-only ถ้าจำเป็น | เส้น เงา texture; ไม่คัดลอกตัวละครหรือสัดส่วน |

สำหรับ leg_B ใช้ leg_F ที่ผ่านแล้วเป็น ref ด้านความสูง ปริมาตร และ finish ได้
พร้อม crop ของ B เพื่อกำกับมุมรองเท้า/สายคาดฝั่งไกล แทนการ mirror F
จำกัด ref ต่อ call ตาม tool ที่ใช้ ปัจจุบันไม่เกิน 5 ภาพ อย่าแนบ ref บทบาททับกันจนสับสน

Prompt แกนกลางที่นำไปปรับใช้ได้:

```text
Generate one complete isolated [PART/SIDE] in one shot on transparent background.
Image 1 supplies [ANATOMY / EDIT TARGET / GARMENT SILHOUETTE: choose explicitly].
Image 2 supplies this side's costume design and material details.
Image 3 is the approved full body. [Describe any other reference roles explicitly.]
Preserve shared anatomical anchors and compact limb length; neutral is the body inside.
Allow the requested garment thickness and ease outside it without enlarging anatomy.
Complete hidden overlap material back to the shared joint; preserve the required hand/foot view.
Use [outfit-specific silhouette and fold instructions]. No extra joint ball or connector.
Keep tapered dark ink, restrained cool-shifted shadow planes and subtle painted texture.
No background, exterior glow, labels, guide marks, bones or neighbouring parts.
```

One shot คือหนึ่ง call ต่อผลทดลองของ part นั้น ใช้ source refs ที่นิ่ง ไม่เอางาน reject มาปะต่อเรื่อยๆ
ไม่ได้แปลว่าห้าม fit/alpha QA/ปรับสีด้วยสคริปต์หลังเจน และไม่ได้รับประกันว่า call แรกจะผ่านเสมอ
ถ้าต้องลองใหม่ ให้แก้ความชัดเจนของ refs/guide/prompt พร้อมบันทึกเวอร์ชัน
บันทึก raw, prompt, refs/บทบาท, metadata และภาพ review ทุกครั้ง

## 6. Fit, alpha และสี

ลำดับ: เจน → ตรวจ part เดี่ยว → fit/ประกอบกับ skeleton → alpha QA → จับคู่สี → render QA
ทำสีบน raw ก่อน fit ได้เช่นกัน แต่ถ้าผูก rig แล้วให้ใช้ภาพ fitted เดิม ขนาดเดิมและ placement เดิม
ห้าม refit หรือเลื่อน pivot เพียงเพราะเปลี่ยนสี

สคริปต์ทำงาน: `python tools/match_materials.py <config.json>`
config กำหนด source/reference material regions ด้วย box/polygon ร่วมกับ HSV filter ได้
paths ทั้งหมด resolve จากโฟลเดอร์ config; ผลเขียนไฟล์ใหม่ ไม่ทับ source

1. เลือก reference เดียวต่อวัสดุทั่วทั้งชุด: ผ้าชนิดเดียวกันเทียบกัน หนังเทียบหนัง ทองเทียบทอง
2. ให้ทุก part ที่มีวัสดุนั้นใช้ reference region เดียวกัน เพื่อให้พาเลตเข้ากัน
3. ผิวใช้หน้าของตัวละครปัจจุบันเป็น ref; การเปลี่ยนหัวอาจต้องทำ skin pass ใหม่
4. ตรวจ mask ว่าไม่เอาหนังสีน้ำตาลไปรวมกับทอง/ผิว หรือผ้าครีมไปรวมกับหนัง
5. รักษาพื้น–เงาและเส้น ไม่แทนทุกพิกเซลเป็นสีเดียว เป้าหมายคือ part ดูเป็นชุดเดียวกัน
   ไม่บังคับสีตรง full body 100% เพราะแสงและการวาดเงาอาจต่างกันได้
6. เก็บ before/after และ report; ตรวจ alpha และขนาดภาพเหมือนเดิม พิกเซลที่ไม่เลือกต้องไม่เปลี่ยน
7. ดูทั้ง part เดี่ยวและตัวที่ประกอบแล้ว โดยเฉพาะ sleeve–torso, trouser F/B, gold และคอ–หน้า

สคริปต์ปัจจุบันจับคู่สถิติ LAB แยก material และรักษาลำดับความสว่างของเงา
ไม่ใช่ระบบ AI แยกวัสดุอัตโนมัติ ยังต้องสร้าง/ทบทวน config ให้เข้ากับชุดใหม่
มันไม่ลบ halo และไม่แก้ alpha: เงาฟุ้งนอกเส้นต้องตรวจบนพื้นสว่างและมืด แล้วเก็บ alpha แยก
อย่าตัดเงา/เส้นภายในที่ตั้งใจวาดโดยเหมาว่าเป็น halo

ตัวอย่างที่ใช้จริง:

- Neutral: `assets/pipeline/recipes/neutral-gray.materials.json` และ `neutral-skin.materials.json`
  — เทาอ้างอิงแขน, ผิวอ้างอิงหน้า
- Time Travel ครบห้า part: `assets/pipeline/recipes/time-travel.materials.json`
- รูปที่ใช้งานจริงอยู่ `assets/rigs/neutral/` และ `assets/rigs/time-travel/`; refs/source
  อยู่ `assets/pipeline/` และ `assets/approved/`; ผลลองรัน recipe ใหม่เขียนลง ignored drafts
- สคริปต์เก่า `match_palette.py` แบ่งกลุ่ม HSV กว้างๆ ยังคงใช้ได้ แต่ไม่แทน material regions

## 7. สิ่งที่ต้องผ่านก่อนล็อกชุดใหม่

Full body หลัง align: sole line ต่างจาก master ไม่เกิน ±1% ของความสูง canonical
บน canvas สูง 1164 คือประมาณ ±11.6 px; ยังต้องตรวจ anatomy/joints แยก แม้ความสูงผ่าน
ความกว้างผ้า/รองเท้า, IoU และจำนวน feature matches เป็นข้อมูลวินิจฉัย ไม่ใช่สั่งแก้ทรงด้วยตัวเลขล้วนๆ

ตรวจใน Rig Lab ทั้งขนาดเกมและตอนซูม:

- Setup เทียบ approved design; ไม่มีชิ้นอื่นติดมา นิ้วและมุมมือ/เท้าถูก
- หมุนไหล่ทั้งสองออกจากลำตัว; ไม่เปิดรูและไม่มีเสื้อ torso ติดไปกับแขน
- งอศอก/เข่าประมาณ 90° และท่าที่ยกแขน/ขา; ไม่มีรอยฉีกหรือส่วนแข็งถูกบี้ผิดที่
- ย่อตัวเท้าติดพื้น, ยกเท้าข้างหนึ่ง, เอียงลำตัวสองท่อน และท่ารวม
- ใช้ animation กลางเดียวกันบน Neutral และชุดใหม่
- ตรวจรอยต่อสี เส้น ขอบ alpha และ sole contact; สีไม่เปลี่ยน geometry

หลัง Time Travel: รวบ checkpoint/commit และ infographic แล้วทดสอบชุดใหม่อีกหนึ่งชุด
ห้ามปรับ skeleton ตามชุดระหว่างพิสูจน์ ถ้าพบปัญหาให้แยกสาเหตุ artwork/fit/weights/runtime
ก่อนพิจารณาเปลี่ยนมาตรฐานกลาง repo มีที่เก็บ assets ที่เสถียรสำหรับ handoff แล้ว
แต่ต้องยืนยัน production asset/atlas/resolution และเตรียม prod หลังด่านนี้
accessory layers เป็นการทดลองลำดับต่อมา

เอกสารปัจจุบัน: [tooling](tooling.md), [integration](../integration.md),
[art direction](../art-direction/README.md); ประวัติเดิมอยู่ `docs/archive/`

## ภาคผนวก: ตัวอย่าง prompt ที่ผ่าน ใช้เป็นกรณีศึกษา

เก็บ prompt จริงพร้อม refs/ผลลัพธ์ที่ผ่านไว้เพื่อย้อนดูเหตุผล ไม่ถือว่า prompt เดียวเป็นสูตรสำเร็จ
สิ่งที่นำไปใช้ซ้ำคือการแบ่งหน้าที่ refs, วิธีระบุ anatomy/garment envelope, hidden overlap
และรายการตรวจ ข้อความเรื่องสี ดีไซน์ และปริมาตรผ้าต้องเปลี่ยนตามชุดใหม่
prompt เก่าอาจอ้างตำแหน่งเข่าก่อน v5; ใช้ spec ปัจจุบันเสมอ

| กรณีที่ผ่าน | Prompt / หลักฐาน | สิ่งที่ได้เรียนรู้ |
|---|---|---|
| Time Travel full body บน Neutral | [prompt](../../assets/approved/time-travel-neutral-ease-v1/prompt.txt), [ผลที่เลือก](../../assets/approved/time-travel-neutral-ease-v1/fullbody.png) | ให้ความหนา/ความหลวมเสื้อผ้าอยู่นอก anatomy |
| Time Travel leg_F primary candidate | [prompt](../../assets/pipeline/examples/time-travel/leg-f.prompt.txt), [ผลที่เลือก](../../assets/pipeline/examples/time-travel/leg-f-source.png) | guide กำกับขอบนอก; fold อยู่ภายใน; full body/crop กำกับดีไซน์ |
| Time Travel leg_B | [prompt](../../assets/pipeline/examples/time-travel/leg-b.prompt.txt), [ผล](../../assets/pipeline/examples/time-travel/leg-b-source.png) | ใช้ F คุม family/ปริมาตร และ crop B คุม perspective; ไม่ mirror |

รายชื่อเหล่านี้เป็น index ไปหา source ที่ใช้จริง ไม่มีความจำเป็นต้องใส่ prompt ยาวทั้งก้อนใน infographic
เวลาใช้กรณีศึกษา ต้องดูรูป ref และรูปผลลัพธ์คู่กับ prompt ไม่พิจารณาข้อความล้วน
