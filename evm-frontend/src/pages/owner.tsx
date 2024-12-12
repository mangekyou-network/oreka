import React from 'react';
import { useRouter } from 'next/router';
import Owner from '../components/Owner';

const OwnerPage = () => {
  const router = useRouter();
  const { address } = router.query; // Lấy địa chỉ từ query params

  return <Owner address={address as string} />;
};

export default OwnerPage;