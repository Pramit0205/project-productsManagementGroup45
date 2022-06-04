const Product = require('../models/productModel');
const validate = require('../utils/validation');
const { uploadFile } = require('../utils/awsUpload');

const addProduct = async (req, res) => {
  try {
    let data = req.body;
    let files = req.files;

    //checking for the valid data
    if(validate.isValid(data)) return res.status(400).send({ status: false, message: "Enter details of the product" });

    //checking for product title
    if(validate.isValid(data.title)) return res.status(400).send({ status: false, message: "Title is required and should not be an empty string" });

    //checking for duplicate title
    let checkTitle = await Product.findOne({ title: data.title });
    if(checkTitle) return res.status(400).send({ status: false, message: "Title already exist" });

    //checking for product description
    if(validate.isValid(data.description) && validate.isValidString(data.description)) return res.status(400).send({ status: false, message: "Description is required and should not be an empty string or any numbers in it" });

    //checking for product price
    if(!(validate.isValidString(data.price) && validate.isValidPrice(data.price))) return res.status(400).send({ status: false, message: "Price of product should be valid and in numbers" });

    //checking for currencyId 
    if(validate.isValid(data.currencyId)) return res.status(400).send({ status: false, message: "Currency Id of product is required and should not be an empty spaces" });

    if(!(/INR/.test(data.currencyId))) return res.status(400).send({ status: false, message: "Currency Id of product should be in uppercase 'INR' format" });

    //checking for currency formate
    if(validate.isValid(data.currencyFormat)) return res.status(400).send({ status: false, message: "Currency format of product is required and should not be an empty spaces" });

    if(!(/₹/.test(data.currencyFormat))) return res.status(400).send({ status: false, message: "Currency format/symbol of product should be in '₹' " });

    //checking freeShipping value is present
    if(data?.isFreeShipping || typeof data.isFreeShipping == 'string') {
      if(!data.isFreeShipping) return res.status(400).send({ status: false, message: "Enter a valid value for is free shipping" })
      if(validate.isValid(data.isFreeShipping)) return res.status(400).send({ status: false, message: "Enter a valid value for is free shipping" })
      if(typeof data.isFreeShipping == 'string'){
        //converting it to lowercase and removing white spaces
        data.isFreeShipping = data.isFreeShipping.toLowerCase().trim();;
        if(data.isFreeShipping == 'true' || data.isFreeShipping == 'false') {
          //convert from string to boolean
          data.isFreeShipping = JSON.parse(data.isFreeShipping);
        }else {
          return res.status(400).send({ status: false, message: "Enter a valid value for isFreeShipping" })
        }
      }
      if(typeof data.isFreeShipping !== 'boolean') return res.status(400).send({ status: false, message: "Free shipping should be in boolean value" })
    }

    //checking for product image
    if(files.length == 0) return res.status(400).send({ status: false, message: "Please upload product image" });

    //uploading the product image
    let productImgUrl = await uploadFile(files[0]);
    data.productImage = productImgUrl;

    //checking for style in data
    if(data?.style){
      if(validate.isValid(data.style) && validate.isValidString(data.style)) return res.status(400).send({ status: false, message: "Style should be valid an does not contain numbers" });
    }

    //checking for available Sizes of the products
    if(validate.isValid(data.availableSizes) && validate.isValidString(data.availableSizes))  return res.status(400).send({ status: false, message: "Enter at least one available size" });

    if (data.availableSizes) {
      var availableSize = data.availableSizes.toUpperCase().split(",") // Creating an array
      if (availableSize.length === 0) {
        return res.status(400).send({ status: false, message: "please provide the product sizes" })
      }
      data.availableSizes = availableSize;
    }

    for(let i = 0;  i < data.availableSizes.length; i++){ 
      if(!validate.isValidSize(data.availableSizes[i])) {
        return res.status(400).send({ status: false, message: "Sizes should one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL' and 'XL'" })
      }
    }
    
    //checking for installments in data
    if(data?.installments || typeof data.installments == 'string') {
      if(!validate.isValidString(data.installments)) return res.status(400).send({ status: false, message: "Installments should be in numbers" });
      if(!validate.isValidPrice(data.installments)) return res.status(400).send({ status: false, message: "Installments should be valid" });
    }

    let createProduct = await Product.create(data);
    res.status(201).send({ status: true, message: "Success", data: createProduct });
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
}

const getFilteredProduct = async (req, res) => {
  try {
    let data = req.query;
    let conditions = { isDeleted: false };

    //checking for any queries
    if(validate.isValid(data)) {
      //getting the products
      let getProducts = await Product.find(conditions).sort({ price: 1 });
      if(getProducts.length == 0) return res.status(404).send({ status: false, message: "No products found" });

      return res.status(200).send({ status: true, count: getProducts.length, message: "Success", data: getProducts })
    }

    //validating the filter - SIZE
    if(data?.size || typeof data.size == 'string') {
      data.size = data.size.toUpperCase();
      if(validate.isValid(data.size)) return res.status(400).send({ status: false, message: "Enter a valid value for size and remove spaces" })

      conditions.availableSizes = {}
      conditions.availableSizes['$in'] = [data.size]
    }

    //validating the filter - NAME
    if(data?.name || typeof data.name == 'string') {
      if(validate.isValid(data.name)) return res.status(400).send({ status: false, message: "Enter a valid value for product name and remove spaces" })

      //using $regex to match the names of products & "i" for case insensitive.
      conditions.title = {};
      conditions.title['$regex'] = data.name
      conditions.title['$options'] = 'i'
    }

    //validating the filter - PRICEGREATERTHAN
    if(data?.priceGreaterThan || typeof data.priceGreaterThan == 'string') {
      if(!validate.isValidString(data.priceGreaterThan)) return res.status(400).send({ status: false, message: "Price of product should be in numbers" });
      
      data.priceGreaterThan = JSON.parse(data.priceGreaterThan);
      if(!validate.isValidNum(data.priceGreaterThan)) return res.status(400).send({ status: false, message: "Price of product should be valid" });

      if(!conditions?.price){
        conditions.price = {}
      }
      conditions.price['$gte'] = data.priceGreaterThan;
    }

    //validating the filter - PRICELESSTHAN
    if(data?.priceLessThan || typeof data.priceLessThan == 'string') {
      if(!validate.isValidString(data.priceLessThan)) return res.status(400).send({ status: false, message: "Price of product should be in numbers" });
      
      data.priceLessThan = JSON.parse(data.priceLessThan);
      if(!validate.isValidNum(data.priceLessThan)) return res.status(400).send({ status: false, message: "Price of product should be valid" });

      if(!conditions?.price){
        conditions.price = {}
      }
      conditions.price['$lte'] = data.priceLessThan
    }

    //get the products with the condition provided
    let getFilterData = await Product.find(conditions).sort({ price: 1 })
    if(getFilterData.length == 0) return res.status(404).send({ status: false, message: "No products found" });

    res.status(200).send({ status: true, count: getFilterData.length, message: "Success", data: getFilterData })
  } catch (err) {
    res.status(500).send({ status: false, error: err.message });
  }
}

const getProductsById = async (req, res) => {
  try{
    let productId = req.params.productId;

    //checking is product id is valid or not
    if (!validate.isValidObjectId(productId)){
      return res.status(400).send({ status: false, message: 'Please provide valid productId' })
    }
  
    //getting the product by it's ID
    const product = await Product.findOne({ _id: productId, isDeleted:false})
    if(!product) return res.status(404).send({ status: false, message:"No product found"})

    return res.status(200).send({ status: true, message: 'Success', data: product})
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const updateProductById = async (req, res) => {
  try {
    let productId = req.params.productId

    if(!validate.isValidObjectId(productId)) return res.status(400).send({ status: false, message: "Enter a valid productId" });

    let checkProduct = await Product.findById(productId);
    if(!checkProduct) return res.status(404).send({ status: false, message: "No product found check the ID and try again" })

    if(checkProduct.isDeleted == true) return res.status(404).send({ status: false, message: "No products found or might have already been deleted" })

    let data = req.body;
    let files = req.files

    //checking for product image
    if(files && files.length > 0) {
      //uploading the product image
      let productImgUrl = await uploadFile(files[0]);
      data.productImage = productImgUrl;
    }

    if(validate.isValid(data)) return res.status(400).send({ status: false, message: "Enter data to update product" });

    if(data?.isDeleted || data?.deletedAt || typeof data.isDeleted == "string" || typeof data.deletedAt == "string") return res.status(400).send({ status: false, message: "Action forbidden" });

    if(data?.title || typeof data.title == 'string') {
      //checking for product title
      if(validate.isValid(data.title)) return res.status(400).send({ status: false, message: "Title should not be an empty string" });

      //checking for duplicate title
      let checkTitle = await Product.findOne({ title: data.title })
      if(checkTitle) return res.status(400).send({ status: false, message: "Title already exist" });
    };

    if(data?.description || typeof data.description == 'string') {
      //checking for product description
      if(validate.isValid(data.description)) return res.status(400).send({ status: false, message: "Description should not be an empty string or any numbers in it" });
      if(validate.isValidString(data.description)) return res.status(400).send({ status: false, message: "Description should not be an empty string or any numbers in it" });
    };

    if(data?.price || typeof data.price == 'string') {
      //checking for product price
      if(!(validate.isValidString(data.price) && validate.isValidPrice(data.price))) return res.status(400).send({ status: false, message: "Price of product should be valid and in numbers" });
    }

    if(data?.currencyId || typeof data.currencyId == 'string') {
      //checking for currencyId 
      if(validate.isValid(data.currencyId)) return res.status(400).send({ status: false, message: "Currency Id of product should not be an empty spaces" });

      if(!(/INR/.test(data.currencyId))) return res.status(400).send({ status: false, message: "Currency Id of product should be in uppercase 'INR' format" });
    }

    if(data?.currencyFormat || typeof data.currencyFormat == 'string') {
      //checking for currency formate
      if(validate.isValid(data.currencyFormat)) return res.status(400).send({ status: false, message: "Currency format of product should not be an empty spaces" });

      if(!(/₹/.test(data.currencyFormat))) return res.status(400).send({ status: false, message: "Currency format/symbol of product should be in '₹' " });
    }

    //checking freeShipping value is present
    if(data?.isFreeShipping || typeof data.isFreeShipping == 'string') {
      //converting it to lowercase and removing white spaces
      data.isFreeShipping = data.isFreeShipping.toLowerCase().trim();;
      if(data.isFreeShipping == 'true' || data.isFreeShipping == 'false') {
        //convert from string to boolean
        data.isFreeShipping = JSON.parse(data.isFreeShipping);
      }else {
        return res.status(400).send({ status: false, message: "Enter a valid value for isFreeShipping" })
      }
      
      if(typeof data.isFreeShipping !== 'boolean') return res.status(400).send({ status: false, message: "Free shipping should be in boolean value" })
    }

    //checking for style in data
    if(data?.style || typeof data.style == 'string'){
      if(validate.isValid(data.style)) return res.status(400).send({ status: false, message: "Style should be valid an does not contain numbers" });
      if(validate.isValidString(data.style)) return res.status(400).send({ status: false, message: "Style should be valid an does not contain numbers" });
    }

    if(data?.availableSizes || typeof data.availableSizes == 'string') {
      //checking for available Sizes of the products
      if(validate.isValid(data.availableSizes))  return res.status(400).send({ status: false, message: "Enter at least one available size" });
      if(validate.isValidString(data.availableSizes))  return res.status(400).send({ status: false, message: "Enter at least one available size" });

      data.availableSizes =  JSON.parse(data.availableSizes);

      for(let i = 0;  i < data.availableSizes.length; i++){
        if(!validate.isValidSize(data.availableSizes[i])) {
          return res.status(400).send({ status: false, message: "Sizes should one of these - 'S', 'XS', 'M', 'X', 'L', 'XXL' and 'XL'" })
        }
      }
    }
    
    //checking for installments in data
    if(data?.installments || typeof data.installments == 'string') {
      if(!(validate.isValidString(data.installments) && validate.isValidNum(data.installments))) return res.status(400).send({ status: false, message: "Installments should be in numbers and valid" });
    }

    let updatedProduct = await Product.findByIdAndUpdate(
      {_id: productId},
      data,
      {new: true}
    )
    res.status(200).send({ status: true, message: "Product updated successfully", data: updatedProduct })
  } catch (err) {
    res.status(500).send({ status: false, error: err.message })
  }
}

const deleteProductById = async function (req, res) {
  try {
    let id = req.params.productId;

    if (!validate.isValidObjectId(id)) {
      return res.status(400).send({ status: false, message: `productId is invalid.` });
    }

    let getProduct = await Product.findOne({ _id: id });
    if (!getProduct) {
      return res.status(404).send({ status: false, message: "No such Product found" });
    }

    if(getProduct.isDeleted == true) {
      return res.status(404).send({ status: false, message: `${getProduct.title} is already been deleted.` })
    }
    
    await Product.updateOne(
        { _id: id },
        { isDeleted: true, deletedAt: Date.now() },
      );
      res.status(200).send({status: true,message: "Successfully deleted the product"});
  } catch (err) {
    res.status(500).send({ status: false, Error: err.message });
  }
};

module.exports = { addProduct, getFilteredProduct, getProductsById, updateProductById, deleteProductById }