ADR — PDP Interactive Boundary & Product Configuration Model

Product domain
├── canonical product identity/data source
├── ListingProduct projection
├── StorefrontProduct projection
└── ProductDetails projection

ProductDetails
├── identity / slug
├── description
├── images
├── options
├── variants
├── ratingSummary
└── personalizationConfig

Separate read domains
├── resolved availability
├── reviews
├── related products
└── complementary products

Client purchase island
├── selected option values
├── selected image
├── quantity
├── personalization language/text
├── lightbox UI
└── cart interaction state

Server authority
├── product/variant relationship
├── price
├── promotion validity
├── availability
├── max quantity
├── personalization validation
├── fee/VAT
└── cart totals
