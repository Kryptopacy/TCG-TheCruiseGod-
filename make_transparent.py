import cv2
import numpy as np

# Read image
img = cv2.imread('app/public/cover.png', cv2.IMREAD_UNCHANGED)

# Add alpha channel if it doesn't exist
if img.shape[2] == 3:
    b, g, r = cv2.split(img)
    alpha = np.ones(b.shape, dtype=b.dtype) * 255
    img = cv2.merge((b, g, r, alpha))

# Change white to transparent
# Define white boundaries (allow some tolerance for anti-aliasing)
lower_white = np.array([230, 230, 230, 255])
upper_white = np.array([255, 255, 255, 255])

# Mask white pixels
mask = cv2.inRange(img, lower_white, upper_white)

# Set masked pixels to transparent
img[mask == 255] = [255, 255, 255, 0]

cv2.imwrite('app/public/cover_transparent.png', img)
