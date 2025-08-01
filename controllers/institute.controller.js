import Institute from "../models/institute.model.js";
import { errorHandler } from "../utils/error.js";
import sequelize from '../config/database.js';
import { Op } from "sequelize"; 
import { io } from "../index.js";
import multer from "multer";
import User from "../models/user.model.js";

const baseURL = "https://api.smartbus360.com";

// Configure Multer for handling driver image uploads
const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/logos"); // Save images in the 'uploads/users' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Generate a unique filename
  },
});

// const logoStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     // Define the directory path for logo storage
//     const uploadPath = "/data/coolify/applications/y00k0swc04ws0csks0o4csog/uploads/logos";
    
//     // Ensure the directory exists
//     fs.mkdirSync(uploadPath, { recursive: true }); // Create the directory if it doesn't exist

//     // Use the directory path for storage
//     cb(null, uploadPath);
//   },
//   filename: (req, file, cb) => {
//     // Generate a unique filename
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// Export the Multer instance for driver image uploads
export const uploadLogoImage = multer({ storage: logoStorage });


export const getInstitutes = async (req, res, next) => {
  const userId = req.user.id;
  const newAccessToken = req.user.newAccessToken;

  try {
    const user = await User.findByPk(userId);
    const isAdmin = Number(user.isAdmin);
    const instituteId = Number(user.instituteId);

    let institutes;

    if (isAdmin === 1) {
      // Super Admin: Get all institutes
      institutes = await sequelize.query(`
        SELECT 
          id,
          name,
          contactNumber,
          email,
          website,
          logo,
          instituteCode,
          establishedYear,
          affiliation,
          principalName,
          totalStudents,
          totalStaff,
          latitude,
          faxNumber,
          institutionBody,
          numberOfBranches,
          socialMediaLinks,
          createdBy,
          status,
          lastUpdatedBy,
          description,
          ownershipType,
          location,
          city,
          postalCode,
          institutionType,
          createdAt,
          updatedAt 
        FROM tbl_sm360_institutes
      `, {
        type: sequelize.QueryTypes.SELECT,
      });
    } else if (isAdmin === 2) {
      // Normal Admin: Get only their assigned institute
      institutes = await sequelize.query(`
        SELECT 
          id,
          name,
          contactNumber,
          email,
          website,
          logo,
          instituteCode,
          establishedYear,
          affiliation,
          principalName,
          totalStudents,
          totalStaff,
          latitude,
          faxNumber,
          institutionBody,
          numberOfBranches,
          socialMediaLinks,
          createdBy,
          status,
          lastUpdatedBy,
          description,
          ownershipType,
          location,
          city,
          postalCode,
          institutionType,
          createdAt,
          updatedAt 
        FROM tbl_sm360_institutes
        WHERE id = :instituteId
      `, {
        replacements: { instituteId },
        type: sequelize.QueryTypes.SELECT,
      });
    } else {
      return res.status(403).json({ message: "Unauthorized access" });
    }

    institutes.forEach(institute => {
      if (institute.logo) {
        institute.logo = `${baseURL}/${institute.logo}`;
      }
    });

    if (newAccessToken) {
      res.setHeader("Authorization", `Bearer ${newAccessToken}`);
    }

    res.status(200).json(institutes);

  } catch (error) {
    next(error);
  }
};

// const adminNotificationNamespace = io.of('/admin/notification');
// Add Institute
export const addInstitute = async (req, res, next) => {
  // const adminNotificationNamespace = io.of('/admin/notification');
  const {
    instituteCode,
    name,
    contactNumber,
    email,
    website,
    logo,
    establishedYear,
    affiliation,
    principalName,
    totalStudents,
    totalStaff,
    latitude,
    faxNumber,
    institutionBody,
    numberOfBranches,
    socialMediaLinks,
    location,
    city,
    postalCode,
    institutionType,
    description,
    ownershipType,
    status,
  } = req.body;

  // Validate required fields
  if (!name || !location || !city || !postalCode || !institutionType) {
    return next(errorHandler(400, "All fields are required"));
  }

  const validatedLogo = req.file
  ? req.file.path
  : "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_960_720.png";

  const validatedContactNumber = contactNumber === "" ? null : contactNumber;
  const validatedEmail = email === "" ? null : email;
  const validatedWebsite = website === "" ? null : website;

  const validatedEstablishedYear =
    establishedYear === "" ? null : establishedYear;
  const validatedAffiliation = affiliation === "" ? null : affiliation;
  const validatedPrincipalName = principalName === "" ? null : principalName;
  const validatedTotalStudents = totalStudents === "" ? null : totalStudents;
  const validatedTotalStaff = totalStaff === "" ? null : totalStaff;
  const validatedLatitude = latitude === "" ? null : latitude;
  const validatedFaxNumber = faxNumber === "" ? null : faxNumber;
  const validatedInstitutionBody =
    institutionBody === "" ? null : institutionBody;
  const validatedNumberOfBranches =
    numberOfBranches === "" ? null : numberOfBranches;
  const validatedSocialMediaLinks =
    socialMediaLinks === "" ? null : socialMediaLinks;
  const validatedStatus = status === "" ? null : status;
  const validatedDescription = description === "" ? null : description;
  const validatedOwnershipType = ownershipType === "" ? null : ownershipType;
  const validatedCity = city === "" ? null : city;
  const validatedPostalCode = postalCode === "" ? null : postalCode;
  const createdBy = req.user.id;
  // const createdBy = '1';
  const validatedLastUpdatedBy = "1";

  const t = await sequelize.transaction();
  try {
    const newInstitute = await Institute.create(
      {
        instituteCode,
        name,
        contactNumber: validatedContactNumber,
        email: validatedEmail,
        website: validatedWebsite,
        logo: validatedLogo,
        establishedYear: validatedEstablishedYear,
        affiliation: validatedAffiliation,
        principalName: validatedPrincipalName,
        totalStudents: validatedTotalStudents,
        totalStaff: validatedTotalStaff,
        latitude: validatedLatitude,
        faxNumber: validatedFaxNumber,
        institutionBody: validatedInstitutionBody,
        numberOfBranches: validatedNumberOfBranches,
        socialMediaLinks: validatedSocialMediaLinks,
        location,
        city: validatedCity,
        postalCode: validatedPostalCode,
        institutionType,
        description: validatedDescription,
        ownershipType: validatedOwnershipType,
        status: validatedStatus,
        createdBy,
      },
      { transaction: t }
    );

    await t.commit();

    // try {
    //   httpSocket.emit("admin_notification", {
    //     message: `New Institute added: ${name}`,
    //   });
    // } catch (emitError) {
    //   console.error("HTTP Socket emit error:", emitError);
    // }
    const adminNotificationNamespace = io.of('/admin/notification');

    const logoURL = newInstitute.logo.startsWith("http")
    ? newInstitute.logo
    : `${baseURL}/${newInstitute.logo}`;

    adminNotificationNamespace.emit("newInstitute", {
      message: `New Institute added: ${newInstitute.name}`,
      institute: {
        id: newInstitute.id,
        ...newInstitute,
        logo: logoURL,
      },
    });

    res.status(201).json({
      success: true,
      message: "Institute added successfully",
      institute: {...newInstitute, logo: logoURL},
    });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

// Update Institute
export const updateInstitute = async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    contactNumber,
    email,
    website,
    establishedYear,
    affiliation,
    principalName,
    totalStudents,
    totalStaff,
    latitude,
    faxNumber,
    institutionBody,
    numberOfBranches,
    socialMediaLinks,
    location,
    city,
    postalCode,
    institutionType,
    description,
    ownershipType,
    status,
    logo
  } = req.body;

  // Validate required fields
  if (!name || !location || !city || !postalCode || !institutionType) {
    return next(errorHandler(400, "All fields are required"));
  }

  const validatedContactNumber = contactNumber === "" ? null : contactNumber;
  const validatedEmail = email === "" ? null : email;
  const validatedWebsite = website === "" ? null : website;
  const validatedEstablishedYear =
    establishedYear === "" ? null : establishedYear;
  const validatedAffiliation = affiliation === "" ? null : affiliation;
  const validatedPrincipalName = principalName === "" ? null : principalName;
  const validatedTotalStudents = totalStudents === "" ? null : totalStudents;
  const validatedTotalStaff = totalStaff === "" ? null : totalStaff;
  const validatedLatitude = latitude === "" ? null : latitude;
  const validatedFaxNumber = faxNumber === "" ? null : faxNumber;
  const validatedInstitutionBody =
    institutionBody === "" ? null : institutionBody;
  const validatedNumberOfBranches =
    numberOfBranches === "" ? null : numberOfBranches;
  const validatedSocialMediaLinks =
    socialMediaLinks === "" ? null : socialMediaLinks;
  const validatedStatus = status === "" ? null : status;
  const validatedDescription = description === "" ? null : description;
  const validatedOwnershipType = ownershipType === "" ? null : ownershipType;
  const validatedCity = city === "" ? null : city;
  const validatedPostalCode = postalCode === "" ? null : postalCode;
  const lastUpdatedBy = req.user.id;

  const updateData = {
    name,
    contactNumber: validatedContactNumber,
    email: validatedEmail,
    website: validatedWebsite,
    establishedYear: validatedEstablishedYear,
    affiliation: validatedAffiliation,
    principalName: validatedPrincipalName,
    totalStudents: validatedTotalStudents,
    totalStaff: validatedTotalStaff,
    latitude: validatedLatitude,
    faxNumber: validatedFaxNumber,
    institutionBody: validatedInstitutionBody,
    numberOfBranches: validatedNumberOfBranches,
    socialMediaLinks: validatedSocialMediaLinks,
    location,
    city: validatedCity,
    postalCode: validatedPostalCode,
    institutionType,
    description: validatedDescription,
    ownershipType: validatedOwnershipType,
    status: validatedStatus,
    lastUpdatedBy,
  };
  
  // Only add `logo` if `req.file` is present
  if (req.file) {
    updateData.logo = req.file.path;
  }
  
  try {
    const [updateCount, updatedInstitutes] = await Institute.update(updateData, {
      where: { id },
      returning: true,
    });
  
    if (updateCount === 0) {
      return next(errorHandler(404, "Institute not found"));
    }
  
    const updatedInstitute = updatedInstitutes?.[0] ?? null;
  
    io.emit("admin_notification", {
      message: `Institute updated: ${name}`,
    });
  
    res.status(200).json({
      success: true,
      message: "Institute updated successfully",
      institute: updatedInstitute
        ? {
            ...updatedInstitute,
            logo: updatedInstitute.logo
              ? updatedInstitute.logo.startsWith("http")
                ? updatedInstitute.logo
                : `${baseURL}/${updatedInstitute.logo}`
              : null,
          }
        : {},
    });
  } catch (error) {
    return next(errorHandler(500, error.message));
  }
  
};

// Delete Institute
export const deleteInstitute = async (req, res, next) => {
  const { id } = req.params;

  try {
    const deleted = await Institute.destroy({ where: { id } });

    if (!deleted) {
      return next(errorHandler(404, "Institute not found"));
    }
    
    io.emit('admin_notification', {
        message: `Institute deleted: ${id}`,
    });
    
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
