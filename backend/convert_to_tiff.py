import cv2
import os

folder = "data/train"

for file in os.listdir(folder):
    if file.endswith(".jpg"):
        path = os.path.join(folder, file)
        img = cv2.imread(path)

        new_name = file.replace(".jpg", ".tif")
        cv2.imwrite(os.path.join(folder, new_name), img)
