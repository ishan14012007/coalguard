import os
import glob
import random
import shutil

base_dir = r"c:\Users\KSHITIJ\Desktop\helmet detection"
raw_img_dir = os.path.join(base_dir, "helmet_detection", "dataset", "images", "raw")
raw_lbl_dir = os.path.join(base_dir, "helmet_detection", "dataset", "labels", "raw")

dataset_dir = os.path.join(base_dir, "helmet_detection", "dataset")

# Create splits
for split in ['train', 'val', 'test']:
    os.makedirs(os.path.join(dataset_dir, "images", split), exist_ok=True)
    os.makedirs(os.path.join(dataset_dir, "labels", split), exist_ok=True)

images = glob.glob(os.path.join(raw_img_dir, "*.jpg"))
random.seed(42)
random.shuffle(images)

n = len(images)
train_end = int(n * 0.7)
val_end = int(n * 0.9)

train_imgs = images[:train_end]
val_imgs = images[train_end:val_end]
test_imgs = images[val_end:]

def copy_files(img_list, split):
    for img_path in img_list:
        img_name = os.path.basename(img_path)
        lbl_name = img_name.replace(".jpg", ".txt")
        lbl_path = os.path.join(raw_lbl_dir, lbl_name)
        
        shutil.copy(img_path, os.path.join(dataset_dir, "images", split, img_name))
        if os.path.exists(lbl_path):
            shutil.copy(lbl_path, os.path.join(dataset_dir, "labels", split, lbl_name))

copy_files(train_imgs, 'train')
copy_files(val_imgs, 'val')
copy_files(test_imgs, 'test')

yaml_content = f"""
path: {dataset_dir}
train: images/train
val: images/val
test: images/test

nc: 3
names: ['good_helmet', 'damaged_helmet', 'no_helmet']
"""
with open(os.path.join(dataset_dir, "data.yaml"), "w") as f:
    f.write(yaml_content)

print("Dataset split and data.yaml generated.")
