import multer from "multer";
import { Advertisement } from "../models/advertisement.model.js";
import path from "path";
import fs from "fs";
import sharp from "sharp";
import sequelize from '../config/database.js';

const baseURL = "https://api.smartbus360.com";

// Configure Multer for handling image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/advertisements"); // Save images in the 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Create a unique file name
  },
});

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, "/var/data/uploads/advertisements"); // Persistent directory
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });


export const upload = multer({ storage }); // Export the upload instance

// Get all advertisements
export const getAllAdvertisements = async (req, res) => {
  try {
    const ads = await Advertisement.findAll();

    // Append the full URL to the advertisement image paths
    ads.forEach(ad => {
      if (ad.imageUrl) {
        ad.imageUrl = `${baseURL}/uploads/advertisements/${path.basename(ad.imageUrl)}`;
      }
    });

    res.json(ads);
  } catch (error) {
    console.error("Error fetching advertisements:", error);
    res.status(500).json({ error: "Failed to fetch advertisements" });
  }
};

// Create a new advertisement
export const addAdvertisement = async (req, res) => {
  const { title, description, link, startDate, endDate } = req.body;
  const image = req.file ? path.basename(req.file.path) : null;

  try {
    const newAd = await Advertisement.create({
      title,
      description,
      imageUrl: image,
      link,
      startDate,
      endDate,
    });
    res.json({ success: true, advertisement: newAd });
  } catch (error) {
    console.error("Error creating advertisement:", error);
    res.status(500).json({ error: "Failed to create advertisement" });
  }
};


// Update an existing advertisement
export const updateAdvertisement = async (req, res) => {
  const { id } = req.params;
  const { title, description, link, startDate, endDate } = req.body;
  const image = req.file ? req.file.path : null;

  try {
    const ad = await Advertisement.findByPk(id);
    if (!ad) {
      return res.status(404).json({ message: "Advertisement not found" });
    }

    // Update fields if they are provided
    ad.title = title || ad.title;
    ad.description = description || ad.description;
    ad.link = link || ad.link;
    ad.startDate = startDate || ad.startDate;
    ad.endDate = endDate || ad.endDate;

    // Update image if a new one is uploaded
    if (image) {
      ad.imageUrl = image;
    }

    await ad.save();
    res.json({ success: true, advertisement: ad });
  } catch (error) {
    res.status(500).json({ message: "Failed to update advertisement" });
  }
};

// Delete an advertisement
export const deleteAdvertisement = async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: "Invalid advertisement ID" });
  }

  try {
    const deletedAd = await Advertisement.destroy({ where: { id } });
    if (!deletedAd) {
      return res.status(404).json({ message: "Advertisement not found" });
    }
    res.json({ success: true, id });
  } catch (error) {
    console.error("Failed to delete advertisement:", error);
    res.status(500).json({ error: "Failed to delete advertisement" });
  }
};

export const generateAdBanner = async (req, res) => {
  try {
    // Fetch the latest active advertisement using raw SQL
    const [ad] = await sequelize.query(
      `
      SELECT * FROM tbl_sm360_advertisements 
      WHERE startDate <= NOW() 
      AND endDate >= NOW() 
      ORDER BY createdAt DESC 
      LIMIT 1
      `,
      {
        type: sequelize.QueryTypes.SELECT,
      }
    );

    if (!ad) {
      return res.status(200).json({ success: true, message: "No active advertisement found" });
    }

    const { id, imageUrl } = ad;

    const bannerDir = path.join(process.cwd(), "uploads/advertisements/");
    const bannerPath = path.join(bannerDir, `ad_banner_${id}.jpeg`);
    const bannerUrl = `${baseURL}/uploads/advertisements/ad_banner_${id}.jpeg`;

    // Check if the directory exists; create it if not
    if (!fs.existsSync(bannerDir)) {
      fs.mkdirSync(bannerDir, { recursive: true });
    }

    // If the banner already exists, return the existing URL
    if (fs.existsSync(bannerPath)) {
      return res.json({ success: true, message: "Advertisement found", bannerUrl });
    }

    // Full path to the original advertisement image
    const backgroundPath = path.join(bannerDir, path.basename(imageUrl));

    if (!fs.existsSync(backgroundPath)) {
      console.error("Background image path:", backgroundPath); // Log the path for debugging
      return res.status(404).json({ success: true, message: "Background image not found" });
    }

    // Generate the banner without overlay text
    await sharp(backgroundPath)
      .resize(800, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } }) // Ensure no cropping and maintain aspect ratio
      .jpeg()
      .toFile(bannerPath); // Save the banner to disk

    // Return the URL for the newly created banner
    res.json({ success: true, message: "Advertisement found", bannerUrl });
  } catch (error) {
    console.error("Error generating advertisement banner:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to generate advertisement banner" });
  }
};

