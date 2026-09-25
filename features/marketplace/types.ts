export type ServicePricingModel = "FLAT_PER_EVENT" | "HOURLY" | "PER_GUEST";

export type ServiceCustomizationMode = "NONE" | "PACKAGE" | "MENU_BUILDER";

export type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
};

export type ServicePackageMenuRule = {
  id?: string;
  course: string;
  chooseCount: number;
  menuItemIds?: string[];
  extraPerGuest?: number | string | null;
};

export type ServicePackage = {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  isActive?: boolean;
  menuRules?: ServicePackageMenuRule[];
};

export type ServiceAddOn = {
  id: string;
  name: string;
  description?: string | null;
  price: number | string;
  isActive?: boolean;
};

export type ServiceMenuItem = {
  id: string;
  name: string;
  description?: string | null;
  course?: string | null;
  price?: number | string | null;
  isActive?: boolean;
};

export type PublicMarketplaceService = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  coverImage?: string | null;
  pricingModel: ServicePricingModel;
  currency: string;
  basePrice?: number | string | null;
  baseCity?: string | null;
  citiesServed?: string[];
  countryCode?: string | null;
  guestMin?: number | null;
  guestMax?: number | null;
  customizationMode?: ServiceCustomizationMode | string | null;
  category?: ServiceCategory | null;
  vendor?: { vendorName?: string | null } | null;
  packages?: ServicePackage[];
  addOns?: ServiceAddOn[];
  menuItems?: ServiceMenuItem[];
};

export type ListPublicMarketplaceServicesResult = {
  data: PublicMarketplaceService[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
