import { Layout, Row, Typography } from 'antd';
import { createStyles } from 'antd-style';
import React from 'react';

const useStyles = createStyles(({ token }) => ({
  title: {
    margin: '0 auto',
    fontWeight: 200,
    color: token.colorTextHeading,
  },
}));

interface Props {
  name: string;
}

// 脚手架示例组件（antd-style: 依赖 token 的组件样式）
const Guide: React.FC<Props> = (props) => {
  const { name } = props;
  const { styles } = useStyles();
  return (
    <Layout>
      <Row>
        <Typography.Title level={3} className={styles.title}>
          欢迎使用 <strong>{name}</strong> ！
        </Typography.Title>
      </Row>
    </Layout>
  );
};

export default Guide;
