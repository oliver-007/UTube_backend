const pagination = async (pageNum, limitForPerPage, tatalDocuments) => {
  try {
    // data type retrieve from query is STRING
    const parsedPageNum = parseInt(pageNum) || 1;
    const parsedLimitForPerPage = parseInt(limitForPerPage) || 10;

    const skip = (parsedPageNum - 1) * parsedLimitForPerPage;

    const totalPages = Math.ceil(tatalDocuments / parsedLimitForPerPage);

    return { parsedLimitForPerPage, skip, totalPages };
  } catch (error) {
    console.log(error);
  }
};

export { pagination };
