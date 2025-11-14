import {
    type CheckoutSelectors,
    type CheckoutService,
    type CustomerInitializeOptions,
    type CustomerRequestOptions,
} from '@bigcommerce/checkout-sdk';
import React, { type FunctionComponent, memo } from 'react';

import { type CheckoutContextProps } from '@bigcommerce/checkout/contexts';

import { withCheckout } from '../checkout';

import { getSupportedMethodIds } from './getSupportedMethods';

export interface CheckoutButtonListProps {
    hideText?: boolean;
    isInitializing?: boolean;
    methodIds?: string[];
    checkEmbeddedSupport?(methodIds: string[]): void;
    deinitialize(options: CustomerRequestOptions): void;
    initialize(options: CustomerInitializeOptions): void;
    onClick?(methodId: string): void;
    onError?(error: Error): void;
}

interface WithCheckoutCheckoutButtonListProps {
    checkoutState: CheckoutSelectors;
    checkoutService: CheckoutService;
}

const CheckoutButtonList: FunctionComponent<WithCheckoutCheckoutButtonListProps & CheckoutButtonListProps> = ({
    methodIds = [],
    checkEmbeddedSupport,
    onError,
}) => {
    const supportedMethodIds = getSupportedMethodIds(methodIds);

    if (supportedMethodIds.length === 0) {
        return null;
    }

    if (checkEmbeddedSupport) {
        try {
            checkEmbeddedSupport(supportedMethodIds);
        } catch (error) {
            if (error instanceof Error && onError) {
                onError(error);
            } else {
                throw error;
            }

            return null;
        }
    }

    // const renderButtons = () => {
    //     return supportedMethodIds.map((methodId) => {
    //         const ResolvedCheckoutButton = resolveCheckoutButton(
    //             { id: methodId },
    //         );

    // if (!ResolvedCheckoutButton) {
    //     return <LazyContainer key={methodId}>
    //         <CheckoutButtonV1Resolver
    //             deinitialize={deinitialize}
    //             initialize={initialize}
    //             isShowingWalletButtonsOnTop={false}
    //             key={methodId}
    //             methodId={methodId}
    //             onClick={onClick}
    //             onError={onClick}
    //         />
    //     </LazyContainer>
    // }

    //         return <LazyContainer key={methodId}>
    //             <ResolvedCheckoutButton
    //                 checkoutService={checkoutService}
    //                 checkoutState={checkoutState}
    //                 containerId={`${methodId}CheckoutButton`}
    //                 language={language}
    //                 methodId={methodId}
    //                 onUnhandledError={onClick}
    //                 onWalletButtonClick={onClick}
    //             />
    //         </LazyContainer>;
    //     });
    // };

    return (
        <>
            {/* {!isInitializing && !hideText && (
                <p>
                    <TranslatedString id="remote.continue_with_text" />
                </p>
            )}

            <div className="checkoutRemote">
                {renderButtons()}
            </div> */}
        </>
    );
};

function mapToCheckoutButtonListProps({
  checkoutState,
  checkoutService,
}: CheckoutContextProps): WithCheckoutCheckoutButtonListProps | null {
    return {
        checkoutService,
        checkoutState,
    };
}

export default memo(withCheckout(mapToCheckoutButtonListProps)(CheckoutButtonList));
