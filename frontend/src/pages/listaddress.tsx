import React from 'react';
import ListAddressOwner from '../components/ListAddressOwner';  // Import component của owner

const ListAddressOwnerPage = ({ ownerAddress }: { ownerAddress: string }  ) => {
  return <ListAddressOwner ownerAddress={ownerAddress}/>;
};

export default ListAddressOwnerPage;
