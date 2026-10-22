"""Colour-only guarantees and material isolation for palette matching."""
import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'tools'))
import cv2
import numpy as np
from match_materials import transfer

class MaterialTransferTests(unittest.TestCase):
    def test_isolation_alpha_and_shading(self):
        hsv=np.zeros((32,32,3),np.uint8)
        hsv[:,:16]=[150,120,150];hsv[:,16:]=[20,180,210]
        hsv[16:,:16,2]=100  # darker cloth plane
        source=np.dstack((cv2.cvtColor(hsv,cv2.COLOR_HSV2RGB),np.full((32,32),255,np.uint8)))
        source[0,0]=[12,5,4,128]  # translucent ink must remain untouched
        target=source.copy();target[...,:3]=[105,70,110]
        materials=[dict(name='cloth',source={'hsv':[[135,30,45],[179,255,255]]},
                        reference={'box':[0,0,32,32]})]
        result,report=transfer(source,target,materials)
        np.testing.assert_array_equal(source[...,3],result[...,3])
        np.testing.assert_array_equal(source[:,16:],result[:,16:])
        np.testing.assert_array_equal(source[0,0],result[0,0])
        light=cv2.cvtColor(result[...,:3],cv2.COLOR_RGB2LAB)[...,0]
        self.assertGreater(float(light[1:16,:16].mean()),float(light[16:,:16].mean()))
        self.assertGreater(report['changed_pixels'],0)

    def test_overlap_rejected(self):
        source=np.full((32,32,4),200,np.uint8);source[...,3]=255
        item=dict(name='same',source={},reference={})
        with self.assertRaisesRegex(ValueError,'Overlapping'):
            transfer(source,source,[item,item])

if __name__=='__main__': unittest.main()
