const formatSuccess = (data, message = 'Success') => {
  return {
    status: 'cod_ok',
    data,
    message
  };
};

module.exports = {
  formatSuccess
};
