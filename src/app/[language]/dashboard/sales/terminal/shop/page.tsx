'use client';

import { useTranslation } from 'react-i18next';

const ShopPage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className='text-2xl font-semibold mb-6'>
        {t('dashboard.terminal.shop.title')}
      </h1>
    </div>
  );
};

export default ShopPage;
