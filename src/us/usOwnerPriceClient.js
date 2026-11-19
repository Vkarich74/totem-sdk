// The US/USD price editor uses the existing src/api/internal.js HTTP transport.
// Keep one auth token source, response parser and API base for all owner cabinets.
import { getUsOwnerServicePrice, putUsOwnerServicePrice } from "../api/internal.js";
import { assertUsPriceIdentity } from "./usOwnerPriceModel.js";

export function getUsOwnerPrice(ownerType,ownerSlug,serviceLinkId,{signal}={}){
  const target=assertUsPriceIdentity(ownerType,ownerSlug,serviceLinkId);
  return getUsOwnerServicePrice(
    target.ownerType,target.ownerSlug,target.serviceLinkId,{signal}
  );
}

export function putUsOwnerPrice(
  ownerType,ownerSlug,serviceLinkId,amountMinor,expectedVersion,{signal}={}
){
  const target=assertUsPriceIdentity(ownerType,ownerSlug,serviceLinkId);
  return putUsOwnerServicePrice(
    target.ownerType,target.ownerSlug,target.serviceLinkId,
    amountMinor,expectedVersion,{signal}
  );
}
