import {
    ExtensionRegion,
    type LineItemMap,
    type ShopperCurrency,
    type StoreCurrency,
} from '@bigcommerce/checkout-sdk/essential';
import React, { type FunctionComponent, type ReactNode } from 'react';

import { Extension } from '@bigcommerce/checkout/checkout-extension';
import { useCheckout, useLocale, useThemeContext } from '@bigcommerce/checkout/contexts';
import { TranslatedHtml } from '@bigcommerce/checkout/locale';

import { OrderSummarySubtotals, type OrderSummarySubtotalsProps } from '../coupon';

import getItemsCount from './getItemsCount';
import OrderSummaryHeader from './OrderSummaryHeader';
import OrderSummaryItems from './OrderSummaryItems';
import OrderSummarySection from './OrderSummarySection';
import OrderSummaryTotal from './OrderSummaryTotal';
import { getNonBundledItems } from './removeBundledItems';

export interface OrderSummaryProps {
    lineItems: LineItemMap;
    total: number;
    headerLink: ReactNode;
    storeCurrency: StoreCurrency;
    shopperCurrency: ShopperCurrency;
    showHeader?: boolean;
}

const OrderSummary: FunctionComponent<OrderSummaryProps & OrderSummarySubtotalsProps> = ({
    headerLink,
    isTaxIncluded,
    lineItems,
    shopperCurrency,
    storeCurrency,
    taxes,
    total,
    showHeader = true,
    ...orderSummarySubtotalsProps
}) => {

    const isReorder = 
        lineItems.physicalItems.some(x => x.sku.startsWith('SPARE'));

    const { currency } = useLocale();
    const { enhancedThemeV1 } = useThemeContext();

    const {
        selectedState: { checkout, order },
    } = useCheckout(({ data }) => ({
        checkout: data.getCheckout(),
        order: data.getOrder(),
    }));

    const isOrderConfirmation = !checkout && !!order;
    const totalDiscount = checkout ? checkout.totalDiscount : order?.totalDiscount;

    if (!currency) {
        return null;
    }

    const isTotalDiscountVisible = Boolean(totalDiscount && totalDiscount > 0);

    // Must match the de-bundling in OrderSummaryItems so the header count equals the item list.
    const { nonBundledItems } = getNonBundledItems(lineItems, order?.bundledItems);

    return (
        <article className="cart optimizedCheckout-orderSummary" data-test="cart">
            {showHeader && (
                <OrderSummaryHeader
                    itemsCount={enhancedThemeV1 ? getItemsCount(nonBundledItems) : undefined}
                >
                    {headerLink}
                </OrderSummaryHeader>
            )}

            <OrderSummarySection>
                <OrderSummaryItems displayLineItemsCount={!enhancedThemeV1} items={lineItems} />
            </OrderSummarySection>

            <Extension region={ExtensionRegion.SummaryLastItemAfter} />

            <OrderSummarySubtotals
                fees={orderSummarySubtotalsProps.fees}
                giftWrappingAmount={orderSummarySubtotalsProps.giftWrappingAmount}
                handlingAmount={orderSummarySubtotalsProps.handlingAmount}
                isOrderConfirmation={isOrderConfirmation}
                isTaxIncluded={isTaxIncluded}
                storeCreditAmount={orderSummarySubtotalsProps.storeCreditAmount}
                taxes={taxes}
                isReorder={isReorder}
            />

            <OrderSummarySection>
                <OrderSummaryTotal
                    orderAmount={total}
                    shopperCurrencyCode={shopperCurrency.code}
                    storeCurrencyCode={storeCurrency.code}
                />
                {isTotalDiscountVisible && totalDiscount && (
                    <div className="total-savings optimizedCheckout-contentSecondary">
                        <TranslatedHtml
                            data={{ totalDiscount: currency.toCustomerCurrency(totalDiscount) }}
                            id="redeemable.total_savings_text"
                        />
                    </div>
                )}
                {shopperCurrency.code !== 'AUD' && (
                    <p>Pay in Full or Spread the cost with our payment options</p>
                )}
            </OrderSummarySection>
        </article>
    );
};

export default OrderSummary;
