'use client';

import React, { useState } from 'react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from '@richman/ui';

export default function UIComponentsDemo() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('button');

  const tableData = [
    { id: 1, property: '青山マンション', units: 12, income: '¥1,200,000', expenses: '¥300,000' },
    { id: 2, property: '渋谷アパート', units: 8, income: '¥800,000', expenses: '¥200,000' },
    { id: 3, property: '新宿ビル', units: 24, income: '¥2,400,000', expenses: '¥600,000' },
  ];

  return (
    <div className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8">UI Components Demo</h1>

      <Tabs defaultValue="button" className="w-full mb-10" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="button" active={activeTab === 'button'}>Button</TabsTrigger>
          <TabsTrigger value="input" active={activeTab === 'input'}>Input</TabsTrigger>
          <TabsTrigger value="card" active={activeTab === 'card'}>Card</TabsTrigger>
          <TabsTrigger value="table" active={activeTab === 'table'}>Table</TabsTrigger>
          <TabsTrigger value="modal" active={activeTab === 'modal'}>Modal</TabsTrigger>
        </TabsList>

        <TabsContent value="button" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Button Component</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Default Button</Button>
            <Button variant="outline">Outline Button</Button>
            <Button variant="ghost">Ghost Button</Button>
            <Button variant="link">Link Button</Button>
            <Button disabled>Disabled Button</Button>
            <Button size="sm">Small Button</Button>
            <Button size="lg">Large Button</Button>
          </div>
        </TabsContent>

        <TabsContent value="input" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Input Component</h2>
          <div className="flex flex-col gap-4 max-w-md">
            <Input placeholder="Default input" />
            <Input placeholder="Disabled input" disabled />
            <Input placeholder="Email input" type="email" />
            <Input placeholder="Password input" type="password" />
            <Input placeholder="Number input" type="number" />
          </div>
        </TabsContent>

        <TabsContent value="card" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Card Component</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>青山マンション</CardTitle>
                <CardDescription>東京都港区南青山</CardDescription>
              </CardHeader>
              <CardContent>
                <p>12ユニット | 築10年</p>
                <p className="mt-2">月間収入: ¥1,200,000</p>
                <p>月間支出: ¥300,000</p>
                <p className="font-bold mt-2">キャッシュフロー: ¥900,000</p>
              </CardContent>
              <CardFooter>
                <Button>詳細を見る</Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>渋谷アパート</CardTitle>
                <CardDescription>東京都渋谷区神南</CardDescription>
              </CardHeader>
              <CardContent>
                <p>8ユニット | 築5年</p>
                <p className="mt-2">月間収入: ¥800,000</p>
                <p>月間支出: ¥200,000</p>
                <p className="font-bold mt-2">キャッシュフロー: ¥600,000</p>
              </CardContent>
              <CardFooter>
                <Button>詳細を見る</Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Table Component</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>物件名</TableHead>
                <TableHead>ユニット数</TableHead>
                <TableHead>月間収入</TableHead>
                <TableHead>月間支出</TableHead>
                <TableHead>アクション</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.property}</TableCell>
                  <TableCell>{row.units}</TableCell>
                  <TableCell>{row.income}</TableCell>
                  <TableCell>{row.expenses}</TableCell>
                  <TableCell>
                    <Button size="sm">詳細</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="modal" className="mt-6">
          <h2 className="text-2xl font-semibold mb-4">Modal Component</h2>
          <div>
            {!isModalOpen ? (
              <Button onClick={() => setIsModalOpen(true)}>モーダルを開く</Button>
            ) : (
              <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
                <ModalContent>
                  <ModalHeader>
                    <ModalTitle>物件の追加</ModalTitle>
                    <ModalDescription>
                      新しい物件の情報を入力してください。
                    </ModalDescription>
                  </ModalHeader>
                  <div className="p-4 space-y-4">
                    <Input placeholder="物件名" />
                    <Input placeholder="住所" />
                    <Input placeholder="購入価格" type="number" />
                  </div>
                  <ModalFooter>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)}>キャンセル</Button>
                    <Button onClick={() => setIsModalOpen(false)}>保存</Button>
                  </ModalFooter>
                </ModalContent>
              </Modal>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
