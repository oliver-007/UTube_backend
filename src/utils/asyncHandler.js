// ++++++ PROMISE APPROACH +++++++
// const asyncHandler = (func) => {
//   return (req, res, next) => {
//     Promise.resolve(func(req, res, next)).catch((error) => next(error));
//   };
// };

// +++++ TRY-CATCH APPROACH +++++
const asyncHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};

export { asyncHandler };
