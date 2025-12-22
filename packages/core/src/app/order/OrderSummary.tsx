import {
    ExtensionRegion,
    type LineItemMap,
    type ShopperCurrency,
    type StoreCurrency,
} from '@bigcommerce/checkout-sdk/essential';
import React, { type FunctionComponent, type ReactNode, useMemo } from 'react';

import { Extension } from '@bigcommerce/checkout/checkout-extension';
import { useCheckout, useLocale, useThemeContext } from '@bigcommerce/checkout/contexts';
import { TranslatedHtml } from '@bigcommerce/checkout/locale';

import { isExperimentEnabled } from '../common/utility';
import { NewOrderSummarySubtotals } from '../coupon';

import OrderSummaryHeader from './OrderSummaryHeader';
import OrderSummaryItems from './OrderSummaryItems';
import OrderSummarySection from './OrderSummarySection';
import OrderSummarySubtotals, { type OrderSummarySubtotalsProps } from './OrderSummarySubtotals';
import OrderSummaryTotal from './OrderSummaryTotal';
import removeBundledItems from './removeBundledItems';

export interface OrderSummaryProps {
    lineItems: LineItemMap;
    total: number;
    headerLink: ReactNode;
    storeCurrency: StoreCurrency;
    shopperCurrency: ShopperCurrency;
    additionalLineItems?: ReactNode;
}

const OrderSummary: FunctionComponent<OrderSummaryProps & OrderSummarySubtotalsProps> = ({
    additionalLineItems,
    headerLink,
    isTaxIncluded,
    lineItems,
    shopperCurrency,
    storeCurrency,
    taxes,
    total,
    ...orderSummarySubtotalsProps
}) => {
    const nonBundledLineItems = useMemo(() => removeBundledItems(lineItems), [lineItems]);

    const isReorder = 
        lineItems.physicalItems.some(x => x.sku.startsWith('SPARE'));

    const { themeV2 } = useThemeContext();
    const { currency } = useLocale();

    // TODO: When removing the experiment, rename `NewOrderSummarySubtotals` to `OrderSummarySubtotals`.
    const { checkoutState } = useCheckout();
    const { checkoutSettings } = checkoutState.data.getConfig() ?? {};
    const checkout = checkoutState.data.getCheckout();
    const isMultiCouponEnabled = isExperimentEnabled(checkoutSettings, 'CHECKOUT-9674.multi_coupon_cart_checkout', false) && Boolean(checkout);
    const totalDiscount = checkout ? checkout.totalDiscount : undefined;

    if (!currency) {
        return null;
    }

    const isTotalDiscountVisible = Boolean(isMultiCouponEnabled && totalDiscount && totalDiscount > 0);

    return (
        <article className="cart optimizedCheckout-orderSummary" data-test="cart">
            <OrderSummaryHeader>{headerLink}</OrderSummaryHeader>

            <OrderSummarySection>
                <OrderSummaryItems displayLineItemsCount items={nonBundledLineItems} themeV2={themeV2} />
            </OrderSummarySection>

            <Extension region={ExtensionRegion.SummaryLastItemAfter} />

            {isMultiCouponEnabled
                ? <NewOrderSummarySubtotals
                        fees={orderSummarySubtotalsProps.fees}
                        giftWrappingAmount={orderSummarySubtotalsProps.giftWrappingAmount}
                        handlingAmount={orderSummarySubtotalsProps.handlingAmount}
                        isTaxIncluded={isTaxIncluded}
                        storeCreditAmount={orderSummarySubtotalsProps.storeCreditAmount}
                        taxes={taxes}
                    />
                : <OrderSummarySection>
                    <OrderSummarySubtotals
                        isTaxIncluded={isTaxIncluded}
                        taxes={taxes}
                        isReorder={isReorder} {...orderSummarySubtotalsProps}
                    />
                    {additionalLineItems}
                </OrderSummarySection>
            }

            <OrderSummarySection>
                <OrderSummaryTotal
                    orderAmount={total}
                    shopperCurrencyCode={shopperCurrency.code}
                    storeCurrencyCode={storeCurrency.code}
                />
                {(isTotalDiscountVisible && totalDiscount) &&
                    <div className="total-savings">
                        <TranslatedHtml
                            data={{ totalDiscount: currency.toCustomerCurrency(totalDiscount) }}
                            id="redeemable.total_savings_text"
                        />
                    </div>
                }
                {shopperCurrency.code !== 'AUD' && (
                    <p>Pay in Full or Spread the cost with our payment options</p>
                )}
            </OrderSummarySection>
        </article>
    );
};

export default OrderSummary;
