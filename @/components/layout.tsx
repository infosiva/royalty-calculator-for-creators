import { useState, useEffect } from 'react';

const currentYear = () => {
  const date = new Date();
  return date.getFullYear();
};

<span> {currentYear()} {config?.name}. All rights reserved.</span>