const User = require("../models/User");

/* ======================================================
   UPSERT USER (CREATE OR UPDATE)
   Used by:
   - Turf booking
   - Coaching enrollment
====================================================== */

exports.upsertUser = async ({
  fullName,
  mobile,
  email,
  address,
  age,
  dateOfBirth,
  gender,
  sportName,
  sourceType // "turf" or "coaching"
}) => {

  try {

    if (!mobile && !email) {
      throw new Error("Mobile or email required to identify user");
    }

    /* ================= NORMALIZE ADDRESS ================= */

    const normalizedAddress = {
      country: address?.country || "India",
      state: address?.state || "Maharashtra",
      city: address?.city || "",
      localAddress: address?.localAddress || ""
    };

    /* ================= FIND EXISTING USER ================= */

    const query = { role: "player", $or: [] };

    if (mobile) query.$or.push({ mobile });
    if (email) query.$or.push({ email });

    let user = await User.findOne(query);

    /* ======================================================
       CREATE NEW USER
    ====================================================== */

    if (!user) {

      const newUser = await User.create({

        fullName,
        mobile,
        email,

        age,
        dateOfBirth,
        gender,

        role: "player",

        address: normalizedAddress,

        userTypes: sourceType ? [sourceType] : [],

        sportsPlayed: sportName ? [sportName] : [],

        source: sourceType === "turf" ? "turf" : "enrollment",

        memberSince: new Date()

      });

      return newUser;

    }

    /* ======================================================
       UPDATE EXISTING USER
    ====================================================== */

    const updateData = {

      fullName,
      email,

      address: normalizedAddress

    };

    if (age) updateData.age = age;
    if (dateOfBirth) updateData.dateOfBirth = new Date(dateOfBirth);
    if (gender) updateData.gender = gender;

    await User.findByIdAndUpdate(
      user._id,
      {
        $set: updateData,

        $addToSet: {
          userTypes: sourceType,
          sportsPlayed: sportName
        }

      },
      { new: true }
    );

    return user;

  } catch (err) {

    console.error("UPSERT USER ERROR:", err);

    throw err;

  }

};